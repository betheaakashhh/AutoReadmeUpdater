/**
 * Detects new or removed environment variables by diffing .env.example / .env.sample.
 * Confidence is very high here because the format is totally unambiguous.
 */

const ENV_FILE_NAMES = ['.env.example', '.env.sample', '.env.template'];

// KEY=value  or  KEY=  or just  KEY
const ENV_VAR_RE = /^([A-Z_][A-Z0-9_]*)(?:=(.*))?$/;

// Boring or system variables that are never worth documenting
const SKIP_VARS = new Set(['PATH', 'HOME', 'USER', 'SHELL', 'TERM', 'PWD', 'LANG', 'LC_ALL']);

/**
 * @param {Array} files — file objects from the GitHub API
 * @returns {Array} change objects  { type, variable, hasDefault, confidence, reason }
 */
function analyzeEnvChanges(files) {
  const changes = [];

  const envFile = files.find(f =>
    ENV_FILE_NAMES.includes(f.filename) ||
    ENV_FILE_NAMES.some(name => f.filename.endsWith('/' + name))
  );

  if (!envFile || !envFile.patch) return changes;

  for (const line of envFile.patch.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) continue;
    // Skip comment lines
    if (line.startsWith('+#') || line.startsWith('-#')) continue;

    if (line.startsWith('+')) {
      const m = ENV_VAR_RE.exec(line.slice(1).trim());
      if (m && !SKIP_VARS.has(m[1])) {
        changes.push({
          type: 'NEW_CONFIG',
          variable: m[1],
          hasDefault: m[2] !== undefined && m[2].trim() !== '',
          confidence: 0.97,
          reason: `New environment variable: ${m[1]}`,
        });
      }
    } else if (line.startsWith('-')) {
      const m = ENV_VAR_RE.exec(line.slice(1).trim());
      if (m && !SKIP_VARS.has(m[1])) {
        changes.push({
          type: 'REMOVED_CONFIG',
          variable: m[1],
          confidence: 0.97,
          reason: `Removed environment variable: ${m[1]}`,
        });
      }
    }
  }

  return changes;
}

module.exports = { analyzeEnvChanges };
