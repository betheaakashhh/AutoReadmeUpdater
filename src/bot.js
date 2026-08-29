

const { isOwnerOrAdmin } = require('./permissions');
const { classifyChanges } = require('./classifier');
const { applyChanges, syncChecklist, syncTOC, syncFolderStructure } = require('./readme/updater');

const BOT_COMMIT_MARKER = '[readme-sync-bot]';
const README_PATH        = process.env.README_PATH   || 'README.md';
const STRICT_OWNER_ONLY  = process.env.STRICT_OWNER_ONLY !== 'false';

/** @param {import('probot').Probot} app */
module.exports = (app) => {
  app.log.info('README Sync Bot ready (code-analysis mode — no AI API)');

  // ── 1. Direct push to the default branch ──────────────────────────────────
  app.on('push', async (context) => {
    context.log.info('▶ push event received');

    const { owner, repo } = context.repo();
    const payload = context.payload;

    // Guard: only act on the default branch
    if (payload.deleted) {
      context.log.info('✋skipped: branch was deleted');
      return;
    }
    if (payload.ref !== `refs/heads/${payload.repository.default_branch}`) {
      context.log.info(`✋ skipped: push was to '${payload.ref}', not the default branch`);
      return;
    }
    // Guard: don't react to our own commits
    if (payload.head_commit?.message?.includes(BOT_COMMIT_MARKER)) {
      context.log.info('✋ skipped: this is the bot\'s own commit');
      return;
    }

    const before = payload.before;
    const after  = payload.after;
    // Guard: skip brand-new branches (no base to compare against)
    if (!before || before === '0000000000000000000000000000000000000000') {
      context.log.info('✋ skipped: no base commit to compare against (new branch)');
      return;
    }

    // Guard: only auto-commit for the owner / admin
    if (STRICT_OWNER_ONLY) {
      const pusher  = payload.sender?.login;
      const trusted = await isOwnerOrAdmin(context.octokit, owner, repo, pusher);
      if (!trusted) {
        context.log.info(`✋ skipped: push by '${pusher}' is not owner/admin — requires PR approval flow`);
        return;
      }
    }

    try {
      const files = await getCompareFiles(context.octokit, owner, repo, before, after);
      context.log.info(`📄 ${files.length} changed file(s) in this push`);
      await processEvent({ context, owner, repo, files, branch: payload.repository.default_branch });
    } catch (err) {
      context.log.error(`❌ push handler failed: ${err.message}`);
      context.log.error(err.stack);
    }
  });

  // ── 2. Pull-request review approved ───────────────────────────────────────
  app.on('pull_request_review', async (context) => {
    context.log.info('▶ pull_request_review event received');

    if (context.payload.review.state !== 'approved') {
      context.log.info(`✋ skipped: review state was '${context.payload.review.state}', not 'approved'`);
      return;
    }

    const pr             = context.payload.pull_request;
    const { owner, repo } = context.repo();
    const isFork         = pr.head.repo?.full_name !== `${owner}/${repo}`;

    try {
      const files = await getPRFiles(context.octokit, owner, repo, pr.number);
      context.log.info(`📄 ${files.length} changed file(s) in PR #${pr.number}${isFork ? ' (fork)' : ''}`);
      await processEvent({
        context, owner, repo, files,
        branch:  pr.head.ref,
        prNumber: pr.number,
        isFork,
      });
    } catch (err) {
      context.log.error(`❌ pull_request_review handler failed: ${err.message}`);
      context.log.error(err.stack);
    }
  });
};

// ─── Core pipeline ────────────────────────────────────────────────────────────

async function processEvent({ context, owner, repo, files, branch, prNumber = null, isFork = false }) {
  const octokit = context.octokit;

  // Remove the README file itself from the diff so we don't react to our own edits
  const filteredFiles = files.filter(f => f.filename !== README_PATH);

  const { toApply, toSuggest } = classifyChanges(filteredFiles);

  // Folder changes accumulate into a whole-tree rebuild rather than a
  // one-line insert, so they're pulled out and synced separately.
  const folderChanges = toApply.filter(c => c.type === 'NEW_FOLDER');
  const otherApply     = toApply.filter(c => c.type !== 'NEW_FOLDER');

  context.log.info(
    `✅ Detected ${toApply.length} auto-apply + ${toSuggest.length} suggest-only change(s)`
  );
  toApply.forEach(c => context.log.info(`   → APPLY: ${c.reason}`));
  toSuggest.forEach(c => context.log.info(`   → SUGGEST: ${c.reason}`));

  // Fetch the current README (ok if it doesn't exist yet)
  let currentReadme = '';
  let readmeSha;
  try {
    const { data } = await octokit.repos.getContent({
      owner, repo, path: README_PATH, ref: branch,
    });
    currentReadme = Buffer.from(data.content, 'base64').toString('utf-8');
    readmeSha     = data.sha;
    context.log.info(`📖 Fetched current ${README_PATH} (${currentReadme.length} chars)`);
  } catch (err) {
    if (err.status !== 404) {
      context.log.error(`❌ Failed to fetch ${README_PATH}: ${err.message}`);
      throw err;
    }
    context.log.info(`ℹ️ No existing ${README_PATH} — will create one`);
  }

  // Apply high-confidence diff-based changes (everything except folders)
  let updatedReadme = currentReadme;
  let report        = [];

  if (otherApply.length > 0) {
    try {
      const result  = applyChanges(currentReadme, otherApply);
      updatedReadme = result.content;
      report        = result.report;
      context.log.info(`✏️  applyChanges() produced ${report.length} edit(s): ${report.join('; ') || '(none)'}`);
    } catch (err) {
      context.log.error(`❌ applyChanges() threw: ${err.message}`);
      context.log.error(err.stack);
      throw err;
    }
  }

  // Fold in any new folders — rebuilds the whole tree from the accumulated
  // set of paths the bot has ever seen, not just today's diff.
  if (folderChanges.length > 0) {
    const { content: withFolders, added } = syncFolderStructure(
      updatedReadme,
      folderChanges.map(c => c.path)
    );
    updatedReadme = withFolders;
    added.forEach(p => report.push(`Added \`${p}\` to Folder Structure tree`));
    context.log.info(`🌳 Folder Structure: ${added.length ? `added ${added.join(', ')}` : 'no new paths'}`);
  }

  // Sync the "needs your judgment, not a diff" checklist (License, Author, etc.)
  // and rebuild the Table of Contents — both run every time regardless of
  // toApply/toSuggest, since they reflect the README's current state overall,
  // not this specific diff.
  const afterApply = updatedReadme;
  const { content: readmeWithChecklist, missing } = syncChecklist(afterApply);
  updatedReadme = syncTOC(readmeWithChecklist);
  const metaChanged = updatedReadme !== afterApply;

  if (missing.length > 0) {
    context.log.info(`📋 Missing sections (needs your judgment): ${missing.map(m => m.label).join(', ')}`);
  } else {
    context.log.info('📋 All recommended human-judgment sections are present');
  }

  const readmeChanged = updatedReadme !== currentReadme;
  context.log.info(`readmeChanged=${readmeChanged} isFork=${isFork}`);

  // Commit if content actually changed and we can push to this branch
  if (readmeChanged && !isFork) {
    try {
      await octokit.repos.createOrUpdateFileContents({
        owner, repo,
        path:    README_PATH,
        message: buildCommitMessage(report, metaChanged),
        content: Buffer.from(updatedReadme, 'utf-8').toString('base64'),
        sha:     readmeSha,      // undefined = create new file
        branch,
      });
      context.log.info(`✅ ${README_PATH} committed successfully to '${branch}'`);
    } catch (err) {
      context.log.error(`❌ Failed to commit ${README_PATH}: ${err.message}`);
      context.log.error(err.stack);
      throw err;
    }
  } else if (readmeChanged && isFork) {
    context.log.info(`ℹ️ README would change but PR is from a fork — cannot push, will comment instead`);
  } else {
    context.log.info('ℹ️ No README changes needed this run');
  }

  // Post a detailed PR comment when there is a PR
  if (prNumber) {
    await postComment(octokit, owner, repo, prNumber, report, toSuggest, isFork, readmeChanged, missing);
    context.log.info(`💬 Comment posted on PR #${prNumber}`);
  }
}

// ─── GitHub API helpers ───────────────────────────────────────────────────────

async function getCompareFiles(octokit, owner, repo, base, head) {
  const { data } = await octokit.repos.compareCommitsWithBasehead({
    owner, repo, basehead: `${base}...${head}`,
  });
  return data.files || [];
}

async function getPRFiles(octokit, owner, repo, pull_number) {
  return octokit.paginate(octokit.pulls.listFiles, {
    owner, repo, pull_number, per_page: 100,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCommitMessage(report, metaChanged) {
  if (report.length === 0 && metaChanged) {
    return `docs: sync checklist & table of contents ${BOT_COMMIT_MARKER}`;
  }

  const summary = report.length === 1
    ? report[0]
    : `${report.length} documentation updates`;

  const body = report.map(r => `- ${r}`).join('\n');
  let msg = `docs: ${summary} ${BOT_COMMIT_MARKER}`;
  if (body) msg += `\n\n${body}`;
  return msg;
}

async function postComment(octokit, owner, repo, issue_number, applied, suggested, isFork, wasCommitted, missing) {
  const lines = ['### 🤖 README Sync Bot\n'];

  if (wasCommitted && !isFork && applied.length > 0) {
    lines.push('**Automatically updated `README.md`:**\n');
    applied.forEach(r => lines.push(`- ✅ ${r}`));
  } else if (isFork && applied.length > 0) {
    lines.push(
      '**README updates detected, but this PR comes from a fork so I ' +
      'cannot push directly. Please apply these changes manually:**\n'
    );
    applied.forEach(r => lines.push(`- 📝 ${r}`));
  }

  if (suggested.length > 0) {
    lines.push('\n**Changes that may need manual review (lower confidence):**\n');
    suggested.forEach(c =>
      lines.push(`- ⚠️ ${c.reason} *(${Math.round(c.confidence * 100)}% confidence)*`)
    );
  }

  if (missing && missing.length > 0) {
    lines.push('\n**📋 Recommended sections still missing (these need your judgment, not the bot\'s):**\n');
    missing.forEach(m => lines.push(`- [ ] ${m.label}`));
  }

  // Nothing worth posting
  if (lines.length <= 1) return;

  await octokit.issues.createComment({ owner, repo, issue_number, body: lines.join('\n') });
}