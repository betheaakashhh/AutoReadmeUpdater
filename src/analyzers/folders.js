/**
 * Detects new top-level project folders by looking at brand-new files'
 * paths. Added-only, like features.js — there's no reliable diff-based way
 * to know a folder was fully deleted (would need to know every file that
 * used to exist under it, not just what changed in this diff).
 */

const KNOWN_ROOTS = ['src', 'lib', 'packages', 'apps', 'test', 'tests'];

function analyzeFolderChanges(files) {
  const changes = [];
  const seen = new Set();

  for (const file of files) {
    if (file.status !== 'added') continue;

    const segments = file.filename.split('/');
    if (segments.length < 3) continue; // need root/folder/file at minimum
    if (!KNOWN_ROOTS.includes(segments[0])) continue;

    const folderPath = segments.slice(0, 2).join('/') + '/';
    if (seen.has(folderPath)) continue;
    seen.add(folderPath);

    changes.push({
      type: 'NEW_FOLDER',
      path: folderPath,
      confidence: 0.80,
      reason: `New folder: ${folderPath}`,
    });
  }

  return changes;
}

module.exports = { analyzeFolderChanges };