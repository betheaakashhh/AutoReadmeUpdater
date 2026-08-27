/**
 * Applies a list of classified changes to README content.
 * KEY DESIGN RULE: only the section affected by each change is touched.
 * Everything else is preserved byte-for-byte.
 *
 * Flow per change:
 *   1. Parse README into sections
 *   2. Find the section relevant to this change type
 *   3. Make a surgical splice into that section's lines
 *   4. Re-join and return the updated content
 *
 * Processes changes one at a time and re-parses between them so line
 * indices always reflect the current state of the document.
 */

const { parseReadme, findSection, getSectionEnd } = require('./parser');
const {
  apiHeadingEntry, apiTableRow, apiSection,
  envTableRow, configSection, checklistBlock,
} = require('./generators');
const { findMissingSections } = require('./sectionAudit');

const CHECKLIST_START = '<!-- readme-sync-bot:checklist:start -->';
const CHECKLIST_END   = '<!-- readme-sync-bot:checklist:end -->';

// Detects heading-style API entries: ### GET /path
const API_HEADING_RE = /^#{2,4}\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+`?(\S+?)`?$/i;
// Detects the header row of an API table: | Method | ...
const API_TABLE_HEADER_RE = /\|\s*method\s*\|/i;
// Detects a data row in an API table: | GET | ...
const API_TABLE_ROW_RE = /^\|\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\|/i;
// Detects the header row of an env-var table: | Variable | ... or | Key | ...
const ENV_TABLE_HEADER_RE = /\|\s*(?:variable|env|key|name)\s*\|/i;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Apply all changes and return the updated README content plus a human-readable report.
 * @param {string} readmeContent  current README.md text (may be empty/null for new files)
 * @param {Array}  changes        output of classifyChanges().toApply
 * @returns {{ content: string, report: string[] }}
 */
function applyChanges(readmeContent, changes) {
  let content = readmeContent || '';
  const report = [];

  for (const change of changes) {
    const result = applyOne(content, change);
    if (result.changed) {
      content = result.content;
      report.push(result.description);
    }
  }

  return { content, report };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

function applyOne(content, change) {
  switch (change.type) {
    case 'NEW_API':        return addApiRoute(content, change);
    case 'MODIFIED_API':   return modifyApiRoute(content, change);
    case 'REMOVED_API':    return removeApiRoute(content, change);
    case 'NEW_CONFIG':     return addEnvVar(content, change);
    case 'REMOVED_CONFIG': return removeEnvVar(content, change);
    default: return { content, changed: false, description: '' };
  }
}

// ─── API changes ──────────────────────────────────────────────────────────────

function addApiRoute(content, change) {
  const { sections, lines } = parseReadme(content);
  const existingApiSection = findSection(sections, 'api');

  // ── No API section at all → create one ──────────────────────────────────
  if (!existingApiSection) {
    return {
      content: content.trimEnd() + '\n' + apiSection([change]),
      changed: true,
      description: `Added \`${change.method} ${change.path}\` (created new API section)`,
    };
  }

  const endLine = getSectionEnd(existingApiSection, sections, lines.length);
  const sectionLines = lines.slice(existingApiSection.startLine, endLine + 1);

  // ── Table format ─────────────────────────────────────────────────────────
  const tableHeaderIdx = sectionLines.findIndex(l => API_TABLE_HEADER_RE.test(l));
  if (tableHeaderIdx !== -1) {
    // Find the last table data row (skip separator at tableHeaderIdx+1)
    let lastDataRow = tableHeaderIdx + 1; // default: separator row
    for (let i = tableHeaderIdx + 2; i < sectionLines.length; i++) {
      if (sectionLines[i].startsWith('|')) lastDataRow = i;
      else break;
    }
    const insertAt = existingApiSection.startLine + lastDataRow + 1;
    lines.splice(insertAt, 0, apiTableRow(change));
    return {
      content: lines.join('\n'),
      changed: true,
      description: `Added \`${change.method} ${change.path}\` to API table`,
    };
  }

  // ── Heading format (or no format yet) → append ### entry ─────────────────
  const entry = apiHeadingEntry(change).split('\n');
  lines.splice(endLine + 1, 0, ...entry);
  return {
    content: lines.join('\n'),
    changed: true,
    description: `Added \`${change.method} ${change.path}\` to API section`,
  };
}

function removeApiRoute(content, change) {
  const { lines } = parseReadme(content);

  // Try heading format first
  const headingIdx = lines.findIndex(l => {
    const m = l.match(API_HEADING_RE);
    return m && m[1].toUpperCase() === change.method && m[2] === change.path;
  });

  if (headingIdx !== -1) {
    const level = lines[headingIdx].match(/^(#{2,4})/)[1].length;
    let endIdx = headingIdx + 1;
    while (endIdx < lines.length) {
      const m = lines[endIdx].match(/^(#{1,6})/);
      if (m && m[1].length <= level) break;
      endIdx++;
    }
    lines.splice(headingIdx, endIdx - headingIdx);
    return {
      content: lines.join('\n'),
      changed: true,
      description: `Removed \`${change.method} ${change.path}\` from API section`,
    };
  }

  // Try table row format
  const rowIdx = lines.findIndex(l =>
    API_TABLE_ROW_RE.test(l) &&
    l.includes(change.method) &&
    l.includes(change.path)
  );
  if (rowIdx !== -1) {
    lines.splice(rowIdx, 1);
    return {
      content: lines.join('\n'),
      changed: true,
      description: `Removed \`${change.method} ${change.path}\` from API table`,
    };
  }

  return { content, changed: false, description: '' };
}

function modifyApiRoute(content, change) {
  const { lines } = parseReadme(content);

  const headingIdx = lines.findIndex(l => {
    const m = l.match(API_HEADING_RE);
    return m && m[1].toUpperCase() === change.method && m[2] === change.path;
  });

  if (headingIdx === -1) return { content, changed: false, description: '' };

  const authLine = '> 🔒 Requires authentication.';
  // Check if an auth notice already exists within the next 3 lines
  const snippet = lines.slice(headingIdx + 1, headingIdx + 4).join('\n');
  const hasAuth = snippet.includes('authentication');

  if (change.requiresAuth && !hasAuth) {
    lines.splice(headingIdx + 1, 0, '', authLine);
    return { content: lines.join('\n'), changed: true, description: change.reason };
  }

  if (!change.requiresAuth && hasAuth) {
    const authIdx = lines.findIndex((l, i) => i > headingIdx && l.includes('authentication'));
    if (authIdx !== -1) {
      // Remove the auth line; also remove surrounding blank lines it leaves
      const from = lines[authIdx - 1] === '' ? authIdx - 1 : authIdx;
      const to   = lines[authIdx + 1] === '' ? authIdx + 1 : authIdx;
      lines.splice(from, to - from + 1);
    }
    return { content: lines.join('\n'), changed: true, description: change.reason };
  }

  return { content, changed: false, description: '' };
}

// ─── Config changes ───────────────────────────────────────────────────────────

function addEnvVar(content, change) {
  const { sections, lines } = parseReadme(content);
  const cfgSection = findSection(sections, 'config');

  // ── No config section at all → create one ────────────────────────────────
  if (!cfgSection) {
    return {
      content: content.trimEnd() + '\n' + configSection([change]),
      changed: true,
      description: `Added \`${change.variable}\` (created new Configuration section)`,
    };
  }

  const endLine = getSectionEnd(cfgSection, sections, lines.length);
  const sectionLines = lines.slice(cfgSection.startLine, endLine + 1);

  // ── Existing env-var table ────────────────────────────────────────────────
  const tableHeaderIdx = sectionLines.findIndex(l => ENV_TABLE_HEADER_RE.test(l));
  if (tableHeaderIdx !== -1) {
    let lastDataRow = tableHeaderIdx + 1;
    for (let i = tableHeaderIdx + 2; i < sectionLines.length; i++) {
      if (sectionLines[i].startsWith('|')) lastDataRow = i;
      else break;
    }
    const insertAt = cfgSection.startLine + lastDataRow + 1;
    lines.splice(insertAt, 0, envTableRow(change));
    return {
      content: lines.join('\n'),
      changed: true,
      description: `Added \`${change.variable}\` to configuration table`,
    };
  }

  // ── No table yet → append one inside the existing section ─────────────────
  const newTable = [
    '',
    '| Variable | Description | Required |',
    '|----------|-------------|----------|',
    envTableRow(change),
  ];
  lines.splice(endLine + 1, 0, ...newTable);
  return {
    content: lines.join('\n'),
    changed: true,
    description: `Added \`${change.variable}\` to configuration section`,
  };
}

function removeEnvVar(content, change) {
  const { lines } = parseReadme(content);

  const idx = lines.findIndex(l =>
    l.startsWith('|') &&
    (l.includes(`\`${change.variable}\``) || new RegExp(`\\|\\s*${change.variable}\\s*\\|`).test(l))
  );

  if (idx !== -1) {
    lines.splice(idx, 1);
    return {
      content: lines.join('\n'),
      changed: true,
      description: `Removed \`${change.variable}\` from configuration section`,
    };
  }

  return { content, changed: false, description: '' };
}

// ─── Recommended-sections checklist ───────────────────────────────────────────

/**
 * Recompute which human-judgment sections (License, Author, etc.) are
 * missing, and update the checklist block in the README to match — removing
 * items the user has since added, adding items that newly became missing,
 * and removing the whole block once nothing is missing anymore.
 *
 * @param {string} content
 * @returns {{ content: string, missing: {id: string, label: string}[] }}
 */
function syncChecklist(content) {
  // Strip any existing checklist block first, so we always rebuild from a
  // clean base rather than accumulating stale copies.
  const startIdx = content.indexOf(CHECKLIST_START);
  const endIdx   = content.indexOf(CHECKLIST_END);

  let stripped = content;
  if (startIdx !== -1 && endIdx !== -1) {
    const before = content.slice(0, startIdx).replace(/\n+$/, '\n');
    const after  = content.slice(endIdx + CHECKLIST_END.length).replace(/^\n+/, '\n');
    stripped = (before + after).replace(/\n{3,}/g, '\n\n');
  }

  const missing = findMissingSections(stripped);

  if (missing.length === 0) {
    return { content: stripped, missing };
  }

  return {
    content: stripped.trimEnd() + '\n' + checklistBlock(missing),
    missing,
  };
}

module.exports = { applyChanges, syncChecklist };