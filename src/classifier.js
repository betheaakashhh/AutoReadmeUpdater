/**
 * Orchestrates all analyzers and applies a global ignore list.
 * Returns a flat list of structured change objects, sorted by confidence.
 *
 * Change types returned:
 *   NEW_API | MODIFIED_API | REMOVED_API            (from routes.js)
 *   NEW_CONFIG | REMOVED_CONFIG                     (from env.js)
 *   NEW_FEATURE                                     (from features.js)
 *   NEW_DEPENDENCY | REMOVED_DEPENDENCY              (from dependencies.js)
 *   NEW_SCRIPT | REMOVED_SCRIPT                      (from dependencies.js)
 *   NEW_FOLDER                                       (from folders.js)
 *
 * Confidence thresholds:
 *   >= 0.90  → AUTO_APPLY  (commit to README automatically)
 *   >= 0.70  → SUGGEST     (mention in PR comment, but don't auto-commit)
 *   <  0.70  → ignored silently
 */

const { analyzeRouteChanges }      = require('./analyzers/routes');
const { analyzeEnvChanges }        = require('./analyzers/env');
const { analyzeFeatureChanges }    = require('./analyzers/features');
const { analyzeDependencyChanges } = require('./analyzers/dependencies');
const { analyzeFolderChanges }     = require('./analyzers/folders');

// Changes in these files should NEVER trigger README updates
const ALWAYS_IGNORE = [
  /\.test\.(js|ts|mjs)$/,
  /\.spec\.(js|ts|mjs)$/,
  /\.md$/,                    // don't react to README edits
  /\.txt$/,
  /\.github\//,               // CI / workflow files
  /\.eslintrc/,
  /\.prettierrc/,
  /jest\.config/,
  /tsconfig\.json$/,
  /webpack\.config/,
  /babel\.config/,
  /\.husky\//,
  /\.vscode\//,
  /CHANGELOG/i,
  /CONTRIBUTING/i,
  /LICENSE/i,
  /node_modules\//,
  /coverage\//,
  /dist\//,
  /build\//,
];

const CONFIDENCE = {
  AUTO_APPLY: 0.90,
  SUGGEST:    0.70,
};

/**
 * @param {Array} files — file objects from the GitHub compare/PR-files API
 * @returns {{ toApply: Array, toSuggest: Array }}
 */
function classifyChanges(files) {
  // Strip always-ignored files first
  const relevant = files.filter(f =>
    !ALWAYS_IGNORE.some(p => p.test(f.filename))
  );

  const all = [
    ...analyzeRouteChanges(relevant),
    ...analyzeEnvChanges(relevant),
    ...analyzeFeatureChanges(relevant),
    ...analyzeDependencyChanges(relevant),
    ...analyzeFolderChanges(relevant),
  ];

  const toApply   = all.filter(c => c.confidence >= CONFIDENCE.AUTO_APPLY);
  const toSuggest = all.filter(c => c.confidence >= CONFIDENCE.SUGGEST && c.confidence < CONFIDENCE.AUTO_APPLY);

  return { toApply, toSuggest };
}

module.exports = { classifyChanges, CONFIDENCE };