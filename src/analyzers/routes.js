/**
 * Detects API route changes (NEW / MODIFIED / REMOVED) by parsing git diffs
 * from JS/TS files. Supports Express, Fastify, and Koa-style patterns.
 * No AI — pure regex + diff analysis.
 */

// Files that should never be treated as route definitions
const SKIP_PATTERNS = [
  /\.test\.(js|ts|mjs)$/,
  /\.spec\.(js|ts|mjs)$/,
  /node_modules/,
  /__tests__/,
  /\.min\.js$/,
  /coverage\//,
];

// Middleware names that signal an endpoint requires authentication
const AUTH_KEYWORDS = [
  'authenticate', 'requireauth', 'verifytoken', 'isauthenticated',
  'protect', 'checkauth', 'authmiddleware', 'passport', 'verifyjwt',
  'ensureAuthenticated', 'authorize', 'requirelogin', 'isloggedin',
  'authguard', 'requiresession',
];

// Matches: router.get('/path', ...) | app.post('/path', ...) | fastify.delete('/path', ...)
const ROUTE_RE = /\b(?:router|app|server|fastify|Route)\s*\.\s*(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

function extractRoutesFromLine(line) {
  const routes = [];
  ROUTE_RE.lastIndex = 0;
  let m;
  while ((m = ROUTE_RE.exec(line)) !== null) {
    routes.push({ method: m[1].toUpperCase(), path: m[2].trim() });
  }
  return routes;
}

function hasAuth(line) {
  const lower = line.toLowerCase();
  return AUTH_KEYWORDS.some(kw => lower.includes(kw));
}

/** Parse a single file's patch and return added/removed route entries. */
function parsePatch(patch) {
  const added = [], removed = [];
  if (!patch) return { added, removed };

  for (const line of patch.split('\n')) {
    // Skip hunk headers and metadata lines
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) continue;

    if (line.startsWith('+')) {
      extractRoutesFromLine(line.slice(1)).forEach(r =>
        added.push({ ...r, requiresAuth: hasAuth(line) }));
    } else if (line.startsWith('-')) {
      extractRoutesFromLine(line.slice(1)).forEach(r =>
        removed.push({ ...r, requiresAuth: hasAuth(line) }));
    }
  }
  return { added, removed };
}

/**
 * Analyse a list of changed files and return structured route changes.
 * @param {Array} files — file objects from the GitHub compare/PR files API
 * @returns {Array} change objects  { type, method, path, requiresAuth, confidence, reason }
 */
function analyzeRouteChanges(files) {
  const allAdded = [], allRemoved = [];

  for (const file of files) {
    if (SKIP_PATTERNS.some(p => p.test(file.filename))) continue;
    if (!/\.(js|ts|mjs|cjs)$/.test(file.filename)) continue;
    if (!file.patch) continue;

    const { added, removed } = parsePatch(file.patch);
    allAdded.push(...added);
    allRemoved.push(...removed);
  }

  const changes = [];
  // Build a lookup by "METHOD:path" so we can detect modifications vs true add/remove
  const removedMap = new Map();
  allRemoved.forEach(r => removedMap.set(`${r.method}:${r.path}`, r));

  for (const route of allAdded) {
    const key = `${route.method}:${route.path}`;
    if (removedMap.has(key)) {
      // Same METHOD+path in both added and removed — check what changed
      const old = removedMap.get(key);
      if (old.requiresAuth !== route.requiresAuth) {
        changes.push({
          type: 'MODIFIED_API',
          method: route.method,
          path: route.path,
          requiresAuth: route.requiresAuth,
          confidence: 0.88,
          reason: route.requiresAuth
            ? `Auth middleware added to ${route.method} ${route.path}`
            : `Auth middleware removed from ${route.method} ${route.path}`,
        });
      }
      removedMap.delete(key); // consumed
    } else {
      changes.push({
        type: 'NEW_API',
        method: route.method,
        path: route.path,
        requiresAuth: route.requiresAuth,
        confidence: 0.93,
        reason: `New route: ${route.method} ${route.path}`,
      });
    }
  }

  // Anything still in removedMap was genuinely deleted
  for (const [, route] of removedMap) {
    changes.push({
      type: 'REMOVED_API',
      method: route.method,
      path: route.path,
      confidence: 0.93,
      reason: `Removed route: ${route.method} ${route.path}`,
    });
  }

  return changes;
}

module.exports = { analyzeRouteChanges };
