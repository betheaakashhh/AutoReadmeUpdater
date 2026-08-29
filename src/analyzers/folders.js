

const IGNORED_ROOTS = new Set([
  'node_modules', '.git', '.github', '.husky', '.vscode',
  'dist', 'build', 'coverage', 'out', '.next', '.cache',
]);

function analyzeFolderChanges(files) {
  const changes = [];
  const seen = new Set();

  for (const file of files) {
    if (file.status !== 'added' && file.status !== 'renamed') continue;

    const segments = file.filename.split('/');
    if (segments.length < 2) continue; // file sits at repo root, not in a folder

    const topLevel = segments[0];
    if (IGNORED_ROOTS.has(topLevel)) continue;

    const folderPath = segments.length >= 3
      ? segments.slice(0, 2).join('/') + '/'
      : topLevel + '/';

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