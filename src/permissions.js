/**
 * Determines whether a given username should be treated as a "trusted"
 * actor whose direct pushes get auto-committed without going through the
 * PR-approval flow.
 */
async function isOwnerOrAdmin(octokit, owner, repo, username) {
  if (!username) return false;
  if (username.toLowerCase() === owner.toLowerCase()) return true;

  try {
    const { data } = await octokit.repos.getCollaboratorPermissionLevel({
      owner,
      repo,
      username,
    });
    return data.permission === "admin";
  } catch (err) {
    // If we can't determine permission (e.g. user not a collaborator), be safe.
    return false;
  }
}

module.exports = { isOwnerOrAdmin };
