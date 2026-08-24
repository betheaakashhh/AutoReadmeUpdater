const README_PATH = process.env.README_PATH || "README.md";

/**
 * Builds a human-readable diff block from a list of changed files
 * (the format returned by both the compare-commits and pulls.listFiles APIs).
 */
function filesToDiffText(files) {
  return files
    .filter((f) => f.filename !== README_PATH) // don't let the bot react to its own edits
    .map((f) => {
      const header = `### ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})`;
      const patch = f.patch
        ? `\n${f.patch}`
        : "\n(binary file or diff too large to display)";
      return `${header}${patch}`;
    })
    .join("\n\n");
}

/** Diff for a direct push: compares the before/after commit SHAs. */
async function getPushDiff(octokit, owner, repo, base, head) {
  const { data } = await octokit.repos.compareCommitsWithBasehead({
    owner,
    repo,
    basehead: `${base}...${head}`,
  });
  return filesToDiffText(data.files || []);
}

/** Diff for a pull request: all files changed across the PR. */
async function getPRDiff(octokit, owner, repo, pull_number) {
  const files = await octokit.paginate(octokit.pulls.listFiles, {
    owner,
    repo,
    pull_number,
    per_page: 100,
  });
  return filesToDiffText(files);
}

module.exports = { getPushDiff, getPRDiff };
