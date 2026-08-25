/**
 * Parses a README.md string into a list of section objects so the updater
 * can locate and modify only the relevant section.
 *
 * Section shape:
 *   { level: number, title: string, startLine: number, endLine: number }
 *
 * endLine is the last line *before* the next same-or-higher-level heading.
 */

// Maps a change category to candidate heading keywords (case-insensitive substring match)
const SECTION_KEYWORDS = {
  api:      ['api', 'endpoint', 'route', 'rest api', 'http api', 'api reference', 'api docs'],
  config:   ['configuration', 'config', 'environment', 'env vars', 'environment variable', 'variables', 'settings'],
  install:  ['installation', 'install', 'getting started', 'quickstart', 'quick start', 'setup'],
  features: ['feature', 'what is this', 'overview', 'about', 'capability'],
};

/**
 * Parse README content into a flat list of sections.
 * @param {string} content
 * @returns {{ sections: Section[], lines: string[] }}
 */
function parseReadme(content) {
  // Normalise line endings
  const lines = (content || '').replace(/\r\n/g, '\n').split('\n');
  const sections = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (m) {
      // Close the previous section
      if (sections.length > 0) {
        sections[sections.length - 1].endLine = i - 1;
      }
      sections.push({
        level:     m[1].length,
        title:     m[2].trim(),
        startLine: i,
        endLine:   lines.length - 1, // updated as we go
      });
    }
  }

  return { sections, lines };
}

/**
 * Find the best-matching section for a given category type.
 * Prefers level-2 headings, then level-1, then level-3.
 * @param {Section[]} sections
 * @param {'api'|'config'|'install'|'features'} type
 * @returns {Section|null}
 */
function findSection(sections, type) {
  const keywords = SECTION_KEYWORDS[type] || [];

  for (const level of [2, 1, 3, 4]) {
    for (const kw of keywords) {
      const found = sections.find(s =>
        s.level === level &&
        s.title.toLowerCase().includes(kw)
      );
      if (found) return found;
    }
  }
  return null;
}

/**
 * Get the actual last line of a section's content (exclusive of the next
 * same-or-higher-level heading). Strips trailing blank lines.
 * @param {Section} section
 * @param {Section[]} sections
 * @param {number} totalLines
 * @returns {number}
 */
function getSectionEnd(section, sections, totalLines) {
  const next = sections.find(s =>
    s.startLine > section.startLine && s.level <= section.level
  );
  return next ? next.startLine - 1 : totalLines - 1;
}

module.exports = { parseReadme, findSection, getSectionEnd };
