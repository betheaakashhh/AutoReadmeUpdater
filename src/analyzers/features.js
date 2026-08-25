/**
 * Detects new feature modules by looking for newly-added files inside
 * conventional feature directory structures (src/features/, src/modules/, etc.).
 * Lower confidence than route/env detection since it's directory-name heuristic.
 */

const FEATURE_DIR_PATTERNS = [
  /^src\/features\/([^/]+)\//,
  /^src\/modules\/([^/]+)\//,
  /^src\/domain\/([^/]+)\//,
  /^src\/plugins\/([^/]+)\//,
  /^lib\/([^/]+)\//,
  /^packages\/([^/]+)\/src\//,
];

/**
 * @param {Array} files — file objects from the GitHub API
 * @returns {Array} change objects  { type, feature, confidence, reason }
 */
function analyzeFeatureChanges(files) {
  const changes = [];
  const seen = new Set();

  for (const file of files) {
    if (file.status !== 'added') continue; // only brand-new files indicate a new feature

    for (const pattern of FEATURE_DIR_PATTERNS) {
      const m = file.filename.match(pattern);
      if (m) {
        const name = m[1];
        if (!seen.has(name)) {
          seen.add(name);
          changes.push({
            type: 'NEW_FEATURE',
            feature: name,
            confidence: 0.75, // lower — directory name is not always meaningful
            reason: `New feature module: ${name}`,
          });
        }
        break; // only match one pattern per file
      }
    }
  }

  return changes;
}

module.exports = { analyzeFeatureChanges };
