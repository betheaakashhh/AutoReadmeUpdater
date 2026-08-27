/**
 * Detects new/removed dependencies and npm scripts from package.json diffs.
 * Tracks which top-level object (dependencies / devDependencies / scripts)
 * each changed line belongs to as it scans the patch.
 *
 * LIMITATION: unified diffs only show a few lines of context around each
 * change. If a dependency is added far from the "dependencies": { opening
 * line (outside that context window), this analyzer can't tell which
 * section it belongs to and will silently skip it — silence over a wrong
 * guess, consistent with the rest of this bot's design.
 */

const PACKAGE_FILE = 'package.json';

const SECTION_OPENERS = {
  dependencies:    /"dependencies"\s*:\s*\{/,
  devDependencies: /"devDependencies"\s*:\s*\{/,
  scripts:         /"scripts"\s*:\s*\{/,
};

// "key": "value"   (value may contain escaped quotes)
const ENTRY_RE = /^"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/;
const CLOSE_RE = /^\}/;

function analyzeDependencyChanges(files) {
  const pkgFile = files.find(f =>
    f.filename === PACKAGE_FILE || f.filename.endsWith('/' + PACKAGE_FILE)
  );
  if (!pkgFile || !pkgFile.patch) return [];

  const changes = [];
  let section = null; // 'dependencies' | 'devDependencies' | 'scripts' | null

  for (const rawLine of pkgFile.patch.split('\n')) {
    if (rawLine.startsWith('+++') || rawLine.startsWith('---') || rawLine.startsWith('@@')) continue;

    const marker = (rawLine[0] === '+' || rawLine[0] === '-') ? rawLine[0] : ' ';
    const line = rawLine.slice(1).trim();

    // Track section context from ANY line (context, added, or removed) —
    // this is what lets us know which object we're currently inside.
    for (const [name, re] of Object.entries(SECTION_OPENERS)) {
      if (re.test(line)) section = name;
    }
    if (CLOSE_RE.test(line) && section) {
      section = null;
      continue;
    }

    if (marker === ' ') continue; // only real changes become a "change"
    if (!section) continue;

    const m = ENTRY_RE.exec(line);
    if (!m) continue;
    const [, key, value] = m;

    if (section === 'scripts') {
      changes.push({
        type: marker === '+' ? 'NEW_SCRIPT' : 'REMOVED_SCRIPT',
        name: key,
        command: value,
        confidence: 0.95,
        reason: `${marker === '+' ? 'New' : 'Removed'} npm script: ${key}`,
      });
    } else {
      changes.push({
        type: marker === '+' ? 'NEW_DEPENDENCY' : 'REMOVED_DEPENDENCY',
        name: key,
        version: value,
        dev: section === 'devDependencies',
        confidence: 0.95,
        reason: `${marker === '+' ? 'New' : 'Removed'}${section === 'devDependencies' ? ' dev' : ''} dependency: ${key}`,
      });
    }
  }

  return changes;
}

module.exports = { analyzeDependencyChanges };