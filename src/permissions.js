/**
 * Determines whether a given GitHub username should be treated as "trusted"
 * (i.e., their direct pushes get auto-committed without going through the
 * PR-approval flow).
 *
 * Trusted = literal repo owner  OR  a collaborator with admin permission.
 */

async function isOwnerOrAdmin(octokit, owner, repo, username) {
  if (!username) return false;
  if (username.toLowerCase() === owner.toLowerCase()) return true;

  try {
    const { data } = await octokit.repos.getCollaboratorPermissionLevel({
      owner, repo, username,
    });
    return data.permission === 'admin';
  } catch {
    // User is not a collaborator or we can't check — treat as untrusted
    return false;
  }
}

module.exports = { isOwnerOrAdmin };
