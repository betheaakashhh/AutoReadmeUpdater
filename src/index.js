require("dotenv").config();

const { classifyChange, regenerateReadme } = require("./analyzer");
const { getPushDiff, getPRDiff } = require("./diff");
const { isOwnerOrAdmin } = require("./permissions");

const BOT_COMMIT_MARKER = "[readme-sync-bot]";
const README_PATH = process.env.README_PATH || "README.md";
const STRICT_OWNER_ONLY = process.env.STRICT_OWNER_ONLY !== "false";

/** @param {import('probot').Probot} app */
module.exports = (app) => {
  app.log.info("README Sync Bot loaded");

  // ── 1) Direct pushes to the default branch ──────────────────────────────
  // Owner/admin pushes get auto-committed immediately.
  app.on("push", async (context) => {
    const { owner, repo } = context.repo();
    const payload = context.payload;

    if (payload.deleted) return; // branch deletion
    if (payload.ref !== `refs/heads/${payload.repository.default_branch}`) return;
    if (payload.head_commit?.message?.includes(BOT_COMMIT_MARKER)) return; // avoid loops

    const before = payload.before;
    const after = payload.after;
    if (!before || before === "0000000000000000000000000000000000000000") return; // new branch

    if (STRICT_OWNER_ONLY) {
      const pusher = payload.sender?.login;
      const trusted = await isOwnerOrAdmin(context.octokit, owner, repo, pusher);
      if (!trusted) {
        app.log.info(`Push by ${pusher} is not owner/admin — skipping direct auto-commit.`);
        return;
      }
    }

    try {
      const diffText = await getPushDiff(context.octokit, owner, repo, before, after);
      if (!diffText.trim()) return;

      await analyzeAndApply({
        context,
        owner,
        repo,
        diffText,
        targetBranch: payload.repository.default_branch,
        prNumber: null,
      });
    } catch (err) {
      app.log.error(err, "Failed to process push event");
    }
  });

  // ── 2) Pull requests — only act once a review is APPROVED ──────────────
  app.on("pull_request_review", async (context) => {
    const review = context.payload.review;
    if (review.state !== "approved") return;

    const pr = context.payload.pull_request;
    const { owner, repo } = context.repo();

    try {
      const diffText = await getPRDiff(context.octokit, owner, repo, pr.number);
      if (!diffText.trim()) return;

      await analyzeAndApply({
        context,
        owner,
        repo,
        diffText,
        targetBranch: pr.head.ref,
        prNumber: pr.number,
        prHeadRepoFullName: pr.head.repo?.full_name,
      });
    } catch (err) {
      app.log.error(err, "Failed to process pull_request_review event");
    }
  });
};

/**
 * Shared logic: classify the diff, and if significant, regenerate and
 * commit the README — either directly (push / same-repo PR branch) or as
 * a suggestion comment (forked PR we can't push to).
 */
async function analyzeAndApply({ context, owner, repo, diffText, targetBranch, prNumber, prHeadRepoFullName }) {
  const octokit = context.octokit;

  const classification = await classifyChange(diffText);
  if (!classification.significant) {
    context.log.info(`No README-worthy change detected: ${classification.reason}`);
    return;
  }

  let currentReadme = "";
  let readmeSha;
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: README_PATH,
      ref: targetBranch,
    });
    currentReadme = Buffer.from(data.content, "base64").toString("utf-8");
    readmeSha = data.sha;
  } catch (err) {
    if (err.status !== 404) throw err; // 404 just means no README yet — that's fine
  }

  const updatedReadme = await regenerateReadme(currentReadme, diffText, classification.summary);
  if (!updatedReadme || updatedReadme.trim() === currentReadme.trim()) return;

  const isFork = prHeadRepoFullName && prHeadRepoFullName !== `${owner}/${repo}`;
  if (isFork) {
    // Can't push to a fork unless the contributor enabled "allow edits by maintainers".
    await postSuggestionComment(octokit, owner, repo, prNumber, classification, updatedReadme);
    return;
  }

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: README_PATH,
    message: `docs: update README.md ${BOT_COMMIT_MARKER}\n\n${classification.summary}`,
    content: Buffer.from(updatedReadme, "utf-8").toString("base64"),
    sha: readmeSha,
    branch: targetBranch,
  });

  if (prNumber) {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: `📝 README.md was automatically updated after approval — ${classification.summary}`,
    });
  }
}

async function postSuggestionComment(octokit, owner, repo, prNumber, classification, updatedReadme) {
  if (!prNumber) return;
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body:
      `📝 **README update suggested** — ${classification.summary}\n\n` +
      `This PR comes from a fork, so I can't push directly to it. Enable ` +
      `"Allow edits by maintainers" on the PR, or copy this in manually:\n\n` +
      `<details><summary>Updated README.md</summary>\n\n` +
      "```markdown\n" + updatedReadme + "\n```\n" +
      `</details>`,
  });
}
