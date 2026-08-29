


const { parseReadme, findSection, getSectionEnd } = require('./parser');
const {
  apiHeadingEntry, apiTableRow, apiSection,
  envTableRow, configSection,
  techStackTableRow, techStackSection,
  usageEntry, usageSection,
  folderStructureBlock,
  checklistBlock,
} = require('./generators');
const { findMissingSections } = require('./sectionAudit');

const CHECKLIST_START = '<!-- readme-sync-bot:checklist:start -->';
const CHECKLIST_END   = '<!-- readme-sync-bot:checklist:end -->';
const TOC_START        = '<!-- readme-sync-bot:toc:start -->';
const TOC_END          = '<!-- readme-sync-bot:toc:end -->';
const FOLDERS_START    = '<!-- readme-sync-bot:folders:start -->';
const FOLDERS_END      = '<!-- readme-sync-bot:folders:end -->';
const FOLDERS_DATA_RE  = /<!-- readme-sync-bot:folders:data:(.*?) -->/;

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
    case 'NEW_API':            return addApiRoute(content, change);
    case 'MODIFIED_API':       return modifyApiRoute(content, change);
    case 'REMOVED_API':        return removeApiRoute(content, change);
    case 'NEW_CONFIG':         return addEnvVar(content, change);
    case 'REMOVED_CONFIG':     return removeEnvVar(content, change);
    case 'NEW_DEPENDENCY':     return addDependency(content, change);
    case 'REMOVED_DEPENDENCY': return removeDependency(content, change);
    case 'NEW_SCRIPT':         return addScript(content, change);
    case 'REMOVED_SCRIPT':     return removeScript(content, change);
    // NEW_FOLDER is deliberately NOT handled here — folder paths accumulate
    // into a whole-tree rebuild via syncFolderStructure(), not a one-line
    // insert like everything else. See bot.js for how it's called.
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

// ─── Tech Stack changes ────────────────────────────────────────────────────────

function addDependency(content, change) {
  const { sections, lines } = parseReadme(content);
  const existingTechSection = findSection(sections, 'techstack');

  if (!existingTechSection) {
    return {
      content: content.trimEnd() + '\n' + techStackSection([change]),
      changed: true,
      description: `Added \`${change.name}\` (created new Tech Stack section)`,
    };
  }

  const endLine = getSectionEnd(existingTechSection, sections, lines.length);
  const sectionLines = lines.slice(existingTechSection.startLine, endLine + 1);

  // Dedupe: skip if this package is already listed anywhere in the section
  if (sectionLines.some(l => l.includes(`\`${change.name}\``))) {
    return { content, changed: false, description: '' };
  }

  const tableHeaderIdx = sectionLines.findIndex(l => /\|\s*package\s*\|/i.test(l));
  if (tableHeaderIdx !== -1) {
    let lastDataRow = tableHeaderIdx + 1;
    for (let i = tableHeaderIdx + 2; i < sectionLines.length; i++) {
      if (sectionLines[i].startsWith('|')) lastDataRow = i;
      else break;
    }
    const insertAt = existingTechSection.startLine + lastDataRow + 1;
    lines.splice(insertAt, 0, techStackTableRow(change));
    return {
      content: lines.join('\n'),
      changed: true,
      description: `Added \`${change.name}\` to Tech Stack table`,
    };
  }

  const newTable = [
    '',
    '| Package | Version | Type |',
    '|---------|---------|------|',
    techStackTableRow(change),
  ];
  lines.splice(endLine + 1, 0, ...newTable);
  return {
    content: lines.join('\n'),
    changed: true,
    description: `Added \`${change.name}\` to Tech Stack section`,
  };
}

function removeDependency(content, change) {
  const { lines } = parseReadme(content);
  const idx = lines.findIndex(l => l.startsWith('|') && l.includes(`\`${change.name}\``));
  if (idx !== -1) {
    lines.splice(idx, 1);
    return {
      content: lines.join('\n'),
      changed: true,
      description: `Removed \`${change.name}\` from Tech Stack section`,
    };
  }
  return { content, changed: false, description: '' };
}

// ─── Usage / script changes ─────────────────────────────────────────────────────

function addScript(content, change) {
  const { sections, lines } = parseReadme(content);
  const existingUsageSection = findSection(sections, 'usage');

  if (!existingUsageSection) {
    return {
      content: content.trimEnd() + '\n' + usageSection([change]),
      changed: true,
      description: `Added \`npm run ${change.name}\` (created new Usage section)`,
    };
  }

  const endLine = getSectionEnd(existingUsageSection, sections, lines.length);
  const sectionLines = lines.slice(existingUsageSection.startLine, endLine + 1);

  if (sectionLines.some(l => l.includes(`npm run ${change.name}`))) {
    return { content, changed: false, description: '' };
  }

  lines.splice(endLine + 1, 0, usageEntry(change));
  return {
    content: lines.join('\n'),
    changed: true,
    description: `Added \`npm run ${change.name}\` to Usage section`,
  };
}

function removeScript(content, change) {
  const { lines } = parseReadme(content);
  const idx = lines.findIndex(l => l.includes(`npm run ${change.name}`));
  if (idx !== -1) {
    lines.splice(idx, 1);
    return {
      content: lines.join('\n'),
      changed: true,
      description: `Removed \`npm run ${change.name}\` from Usage section`,
    };
  }
  return { content, changed: false, description: '' };
}

// ─── Folder Structure (accumulated tree, rebuilt fresh every run) ──────────────

/**
 * Merge newly-detected folder paths into the full set the bot has ever seen
 * (stored invisibly in a data comment) and re-render the whole tree from
 * that set. This is why it can "arrange" folders properly regardless of
 * what order they were created in — every run rebuilds the complete
 * hierarchy from the full accumulated list, not just today's diff.
 *
 * @param {string} content
 * @param {string[]} newPaths — folder paths detected in this diff, e.g. ['assets/']
 * @returns {{ content: string, added: string[] }}
 */
function syncFolderStructure(content, newPaths) {
  const startIdx = content.indexOf(FOLDERS_START);
  const endIdx   = content.indexOf(FOLDERS_END);

  let knownPaths = [];
  let stripped = content;

  if (startIdx !== -1 && endIdx !== -1) {
    const block = content.slice(startIdx, endIdx + FOLDERS_END.length);
    const m = FOLDERS_DATA_RE.exec(block);
    if (m) {
      try { knownPaths = JSON.parse(m[1]); } catch { knownPaths = []; }
    }
    const before = content.slice(0, startIdx).replace(/\n+$/, '\n');
    const after  = content.slice(endIdx + FOLDERS_END.length).replace(/^\n+/, '\n');
    stripped = (before + after).replace(/\n{3,}/g, '\n\n');
  }

  const merged = new Set(knownPaths);
  const added = [];
  newPaths.forEach(p => {
    if (!merged.has(p)) {
      merged.add(p);
      added.push(p);
    }
  });

  const allPaths     = Array.from(merged).sort();
  const treeBlock     = folderStructureBlock(allPaths);
  const dataComment  = `<!-- readme-sync-bot:folders:data:${JSON.stringify(allPaths)} -->`;
  const fullBlock    = `${FOLDERS_START}\n${treeBlock}\n${dataComment}\n${FOLDERS_END}\n`;

  return {
    content: stripped.trimEnd() + '\n\n' + fullBlock,
    added,
  };
}

// ─── Table of Contents (recomputed every run, not diff-triggered) ──────────────

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

/**
 * Rebuild the Table of Contents from the README's current level-2 headings.
 * Runs on every pass, independent of any specific diff — it reflects
 * whatever the document looks like right now, including sections other
 * analyzers just added or removed in this same run.
 *
 * @param {string} content
 * @returns {string} updated content
 */
function syncTOC(content) {
  const startIdx = content.indexOf(TOC_START);
  const endIdx   = content.indexOf(TOC_END);

  let stripped = content;
  if (startIdx !== -1 && endIdx !== -1) {
    const before = content.slice(0, startIdx).replace(/\n+$/, '\n');
    const after  = content.slice(endIdx + TOC_END.length).replace(/^\n+/, '\n');
    stripped = (before + after).replace(/\n{3,}/g, '\n\n');
  }

  const { sections, lines } = parseReadme(stripped);
  const level2 = sections.filter(s =>
    s.level === 2 && s.title.toLowerCase() !== 'table of contents'
  );

  if (level2.length === 0) {
    return stripped; // nothing to link to
  }

  const entries = level2.map(s => `- [${s.title}](#${slugify(s.title)})`).join('\n');
  const block = `${TOC_START}\n## Table of Contents\n\n${entries}\n${TOC_END}`;

  const h1 = sections.find(s => s.level === 1);
  if (!h1) {
    return stripped.trimEnd() + '\n\n' + block + '\n';
  }

  const insertAt = h1.startLine + 1;
  const newLines = [...lines.slice(0, insertAt), '', block, '', ...lines.slice(insertAt)];
  return newLines.join('\n').replace(/\n{3,}/g, '\n\n');
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

module.exports = { applyChanges, syncChecklist, syncTOC, syncFolderStructure };