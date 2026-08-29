
function apiHeadingEntry(change) {
  const params = [...change.path.matchAll(/:([a-zA-Z_]\w*)/g)].map(m => m[1]);
  let md = `\n### ${change.method} \`${change.path}\`\n`;

  if (change.requiresAuth) {
    md += `\n> 🔒 Requires authentication.\n`;
  }

  if (params.length > 0) {
    md += `\n**Path Parameters**\n\n`;
    md += `| Parameter | Type   | Description |\n`;
    md += `|-----------|--------|-------------|\n`;
    params.forEach(p => { md += `| \`${p}\` | string | —           |\n`; });
  }

  md += '\n';
  return md;
}

/**
 * Generate a single table row for an API route.
 * Used when the API section uses a | Method | Endpoint | Description | table.
 */
function apiTableRow(change) {
  const auth = change.requiresAuth ? ' 🔒' : '';
  return `| ${change.method} | \`${change.path}\` | —${auth} |`;
}

/**
 * Generate a complete ## API section from scratch (when none exists).
 */
function apiSection(changes) {
  let md = `\n## API\n\n`;
  md += `| Method | Endpoint | Description |\n`;
  md += `|--------|----------|-------------|\n`;
  changes.forEach(c => { md += `${apiTableRow(c)}\n`; });
  return md;
}

// ── Config / env generators ───────────────────────────────────────────────────

/**
 * Generate a single table row for an environment variable.
 */
function envTableRow(change) {
  const required = change.hasDefault ? 'Optional' : 'Required';
  const desc     = inferEnvDesc(change.variable);
  return `| \`${change.variable}\` | ${desc} | ${required} |`;
}

/**
 * Generate a complete ## Configuration section from scratch.
 */
function configSection(changes) {
  let md = `\n## Configuration\n\n`;
  md += `| Variable | Description | Required |\n`;
  md += `|----------|-------------|----------|\n`;
  changes.forEach(c => { md += `${envTableRow(c)}\n`; });
  return md;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Try to guess a readable description from a SCREAMING_SNAKE_CASE variable name.
 * Falls back to converting it to Title Case words.
 */
function inferEnvDesc(varName) {
  const KNOWN = {
    DATABASE_URL:          'Database connection URL',
    DATABASE_URI:          'Database connection URI',
    MONGO_URI:             'MongoDB connection URI',
    MONGODB_URI:           'MongoDB connection URI',
    REDIS_URL:             'Redis connection URL',
    PORT:                  'Server port',
    HOST:                  'Server host',
    NODE_ENV:              'Runtime environment (`development` / `production` / `test`)',
    JWT_SECRET:            'JWT signing secret',
    JWT_EXPIRY:            'JWT expiry duration',
    JWT_EXPIRES_IN:        'JWT expiry duration',
    SESSION_SECRET:        'Session secret',
    SECRET_KEY:            'Application secret key',
    API_KEY:               'API key',
    STRIPE_SECRET_KEY:     'Stripe secret API key',
    STRIPE_PUBLISHABLE_KEY:'Stripe publishable key',
    STRIPE_WEBHOOK_SECRET: 'Stripe webhook signing secret',
    SENDGRID_API_KEY:      'SendGrid API key',
    SMTP_HOST:             'SMTP server host',
    SMTP_PORT:             'SMTP server port',
    SMTP_USER:             'SMTP username',
    SMTP_PASS:             'SMTP password',
    SMTP_PASSWORD:         'SMTP password',
    AWS_ACCESS_KEY_ID:     'AWS access key ID',
    AWS_SECRET_ACCESS_KEY: 'AWS secret access key',
    AWS_REGION:            'AWS region',
    S3_BUCKET:             'S3 bucket name',
    CLOUDINARY_URL:        'Cloudinary connection URL',
    TWILIO_ACCOUNT_SID:    'Twilio account SID',
    TWILIO_AUTH_TOKEN:     'Twilio auth token',
    GOOGLE_CLIENT_ID:      'Google OAuth client ID',
    GOOGLE_CLIENT_SECRET:  'Google OAuth client secret',
    GITHUB_CLIENT_ID:      'GitHub OAuth client ID',
    GITHUB_CLIENT_SECRET:  'GitHub OAuth client secret',
    LOG_LEVEL:             'Logging level',
    CORS_ORIGIN:           'CORS allowed origin(s)',
    ALLOWED_ORIGINS:       'CORS allowed origins',
    BASE_URL:              'Base URL of the application',
    APP_URL:               'Application URL',
    FRONTEND_URL:          'Frontend URL',
  };

  if (KNOWN[varName]) return KNOWN[varName];

  return varName
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ── Checklist block (for sections the bot can't auto-write) ──────────────────

/**
 * Generate the "recommended sections you still need to add yourself" block.
 * Wrapped in HTML comment markers so future runs can find and replace this
 * exact block instead of duplicating it.
 */
function checklistBlock(missing) {
  let md = `\n<!-- readme-sync-bot:checklist:start -->\n`;
  md += `## 📋 Recommended Sections Checklist\n\n`;
  md += `_The bot can't write these automatically — they need your judgment, not a diff. `;
  md += `This list updates itself as you add them:_\n\n`;
  missing.forEach(m => { md += `- [ ] ${m.label}\n`; });
  md += `<!-- readme-sync-bot:checklist:end -->\n`;
  return md;
}

// ── Tech Stack generators ──────────────────────────────────────────────────

function techStackTableRow(change) {
  const type = change.dev ? 'dev dependency' : 'dependency';
  return `| \`${change.name}\` | ${change.version} | ${type} |`;
}

function techStackSection(changes) {
  let md = `\n## Tech Stack\n\n`;
  md += `| Package | Version | Type |\n`;
  md += `|---------|---------|------|\n`;
  changes.forEach(c => { md += `${techStackTableRow(c)}\n`; });
  return md;
}

// ── Usage generators ────────────────────────────────────────────────────────

function usageEntry(change) {
  return `- \`npm run ${change.name}\` — \`${change.command}\``;
}

function usageSection(changes) {
  let md = `\n## Usage\n\n`;
  changes.forEach(c => { md += `${usageEntry(c)}\n`; });
  return md;
}

// ── Folder Structure generators ─────────────────────────────────────────────

/**
 * Build a nested object from a flat list of folder paths, e.g.
 * ['src/', 'src/features/', 'assets/'] → { src: { features: {} }, assets: {} }
 */
function buildFolderTree(paths) {
  const root = {};
  paths.forEach(p => {
    const parts = p.split('/').filter(Boolean);
    let node = root;
    parts.forEach(part => {
      node[part] = node[part] || {};
      node = node[part];
    });
  });
  return root;
}

/** Render a nested folder tree as ASCII, in the usual README style. */
function renderFolderTree(node, prefix = '') {
  const keys = Object.keys(node).sort();
  let out = '';
  keys.forEach((key, i) => {
    const isLast = i === keys.length - 1;
    out += `${prefix}${isLast ? '└── ' : '├── '}${key}/\n`;
    out += renderFolderTree(node[key], prefix + (isLast ? '    ' : '│   '));
  });
  return out;
}

/** Full "## Folder Structure" block, rendered fresh from a path list. */
function folderStructureBlock(paths) {
  const tree = buildFolderTree(paths);
  const rendered = renderFolderTree(tree).trimEnd();
  return `## Folder Structure\n\n\`\`\`\n${rendered}\n\`\`\``;
}

// ── Checklist block (for sections the bot can't auto-write) ──────────────────

/**
 * Generate the "recommended sections you still need to add yourself" block.
 * Wrapped in HTML comment markers so future runs can find and replace this
 * exact block instead of duplicating it.
 */
function checklistBlock(missing) {
  let md = `\n<!-- readme-sync-bot:checklist:start -->\n`;
  md += `## 📋 Recommended Sections Checklist\n\n`;
  md += `_The bot can't write these automatically — they need your judgment, not a diff. `;
  md += `This list updates itself as you add them:_\n\n`;
  missing.forEach(m => { md += `- [ ] ${m.label}\n`; });
  md += `<!-- readme-sync-bot:checklist:end -->\n`;
  return md;
}

module.exports = {
  apiHeadingEntry, apiTableRow, apiSection,
  envTableRow, configSection,
  techStackTableRow, techStackSection,
  usageEntry, usageSection,
  buildFolderTree, renderFolderTree, folderStructureBlock,
  checklistBlock,
};