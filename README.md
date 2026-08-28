# README Sync Bot

[![Docs: Auto-updated](https://img.shields.io/badge/docs-auto--updated-4AC26B?style=flat-square)](https://github.com/betheaakashhh/AutoReadmeUpdater)
[![Built with Probot](https://img.shields.io/badge/built%20with-probot-E3B341?style=flat-square)](https://probot.github.io/)
[![No AI](https://img.shields.io/badge/no-AI%20API-0B0E14?style=flat-square)](https://github.com/betheaakashhh/AutoReadmeUpdater)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-333?style=flat-square)](package.json)

> A GitHub App that watches every push and pull request, and surgically updates only the parts of `README.md` a code change actually invalidates — using diff parsing, not a language model.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [How It Works](#how-it-works)
- [What It Detects](#what-it-detects)
- [What It Ignores](#what-it-ignores)
- [Who Gets What](#who-gets-what)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [HTTP Routes](#http-routes)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Extending](#extending)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## Features

- 🔍 Detects new/removed API routes, env vars, and feature directories directly from git diffs
- ✏️ Edits only the affected README section — everything else is preserved byte-for-byte
- 🎚️ Confidence-scored: high-confidence changes auto-commit, mid-confidence changes get posted as a PR comment, low-confidence changes are ignored
- 🔐 Owner/admin pushes can auto-commit directly; everyone else's changes land only after PR approval
- 🌐 Custom landing page with a live look at the confidence thresholds in use
- 🚫 No AI API, no external calls beyond the GitHub API — fully deterministic and inspectable

## Tech Stack

- **Runtime:** Node.js ≥ 18
- **Framework:** [Probot](https://probot.github.io/) (GitHub App framework) + Express (custom server for full route control)
- **GitHub integration:** Octokit (via Probot's built-in `context.octokit`)
- **Config:** dotenv
- **Hosting:** Render (or any Node host that can receive HTTPS webhooks)

## Folder Structure

```
src/
├── server.js             Express entry point — webhook middleware + landing page + health check
├── bot.js                Probot app function: push & pull_request_review event handlers
├── landing.js            Standalone HTML for the root landing page
├── permissions.js        Owner / admin check
├── classifier.js         Orchestrates all analyzers, applies the ignore list, sorts by confidence
├── analyzers/
│   ├── routes.js         Express / Fastify / Koa route change detection
│   ├── env.js            .env.example change detection
│   └── features.js       New feature directory detection
└── readme/
    ├── parser.js         Splits README.md into sections by heading
    ├── generators.js     Markdown templates (table rows, headings, whole sections)
    └── updater.js        Surgical per-section update logic
```

## How It Works

```
Git push / PR approved
        │
        ▼
  Get changed files (with patches, from the GitHub API)
        │
        ▼
┌───────────────────────────────┐
│       Change Classifier        │
│  routes.js   → API routes      │
│  env.js      → env variables   │
│  features.js → new modules     │
└──────────────┬────────────────┘
               │
    ┌──────────┴──────────┐
    │                      │
 Ignored               Significant
 (< 70% confidence)    (≥ 70% confidence)
                           │
              ┌────────────┴────────────┐
        70–90%: PR comment      ≥ 90%: parse README,
        (suggested, not         find affected section,
         auto-applied)          splice in the change,
                                 commit
```

## What It Detects

| What changed | Detected how | Confidence | README action |
|---|---|---|---|
| New `router.get('/path', ...)` | Regex on diff | 93% | Add to API section |
| Removed route | Regex on diff | 93% | Remove from API section |
| Auth middleware added to route | Keyword match on diff | 88% | Add 🔒 badge to entry |
| New `.env.example` variable | Diff line parsing | 97% | Add row to config table |
| Removed `.env.example` variable | Diff line parsing | 97% | Remove row from config table |
| New `src/features/x/` directory | File path heuristic | 75% | Mention in PR comment |

Changes under 90% confidence are never auto-committed — they're mentioned in a PR comment for manual review. Changes under 70% are ignored entirely.

## What It Ignores

Configured in `classifier.js` → `ALWAYS_IGNORE`:

- Test files (`*.test.js`, `*.spec.ts`, `__tests__/`)
- CI / workflow / tooling config (`.github/`, `jest.config.*`, `.eslintrc`, `.prettierrc`, `tsconfig.json`, `webpack.config`, `babel.config`, `.husky/`, `.vscode/`)
- `CHANGELOG`, `CONTRIBUTING`, `LICENSE` files
- `node_modules/`, `coverage/`, `dist/`, `build/`
- Any change to `README.md` itself (no feedback loops)

## Who Gets What

| Actor | Push event | PR approved |
|---|---|---|
| **Repo owner / admin** | README auto-committed immediately | README auto-committed to the PR branch |
| **Contributor (non-admin)** | Ignored on push (must open a PR) | README auto-committed after approval |
| **Fork contributor** | — | Suggested changes posted as a PR comment (can't push to a fork) |

Controlled by `STRICT_OWNER_ONLY` (default `true`).

## Prerequisites

- Node.js ≥ 18
- A GitHub account with permission to create a GitHub App on the target org/user
- A host that can receive inbound HTTPS webhooks (Render, Railway, Fly.io, a VPS, etc.)

## Installation

### 1. Register the GitHub App

Go to **https://github.com/settings/apps/new**:

- **Webhook URL** — your deployment URL + `/api/github/webhooks`
  (e.g. `https://your-app.onrender.com/api/github/webhooks`)
- **Webhook secret** — any random string, save it
- **Repository permissions:**
  - Contents: **Read & write**
  - Pull requests: **Read & write**
  - Metadata: **Read-only** (auto-selected)
- **Subscribe to events:** `Push`, `Pull request review`

After creating the App:
1. Click **Generate a private key** → downloads a `.pem` file
2. Go to **Install App** and install it on the repo(s) you want managed (make sure repository access isn't set to "No repositories")

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `APP_ID`, `PRIVATE_KEY` (full `.pem` contents, keep the `\n` line breaks), and `WEBHOOK_SECRET` from the App's settings page.

### 3. Install dependencies

```bash
npm install
```

## Environment Variables

| Variable | Description | Required | Default |
|---|---|---|---|
| `APP_ID` | Numeric ID from your GitHub App's settings page | ✅ | — |
| `PRIVATE_KEY` | Full contents of the App's downloaded `.pem` key | ✅ | — |
| `WEBHOOK_SECRET` | Secret configured on the App's webhook | ✅ | — |
| `README_PATH` | Path to the README to update (useful for monorepos) | — | `README.md` |
| `STRICT_OWNER_ONLY` | Only owner/admin direct pushes auto-commit | — | `true` |
| `PORT` | Local server port | — | `3000` |

## Running Locally

```bash
npm start
```

Runs `node ./src/server.js` — a plain Express server (not the `probot run` CLI), so the root URL serves the real landing page instead of Probot's default page.

## HTTP Routes

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | Landing page |
| `GET` | `/healthz` | Liveness check (`{ status: "ok" }`) — useful for uptime pingers |
| `POST` | `/api/github/webhooks` | GitHub webhook receiver (must match the App's configured Webhook URL) |
| GET | `/api/orders/:id/status` | — |

## Deployment

Deploy to any Node host that can receive HTTPS webhooks. On Render specifically:

- **Start Command:** leave blank (or `npm start`) — do **not** override it to `node src/index.js`, which bypasses the correct entry point
- Set `APP_ID`, `PRIVATE_KEY`, `WEBHOOK_SECRET` as environment variables in the dashboard (not just in a local `.env` — Render doesn't read that file)
- Free-tier services spin down after ~15 min idle, which can delay or drop a webhook delivery on cold start; consider an uptime pinger against `/healthz` or a paid instance if reliability matters

## Troubleshooting

Real issues hit while building this, kept here so they're not re-debugged from scratch:

| Symptom | Cause | Fix |
|---|---|---|
| Crashes on boot reading `process.env.X` | A local variable/function shadowed the global `process` | Rename the local identifier |
| `node src/index.js` exits immediately with no output | Probot apps need `probot run`, not a plain `node` invocation, unless using a custom server (see `server.js`) | Use the correct start command |
| `App ID is missing` | `APP_ID` env var not set in the actual hosting platform | Set it in the platform's dashboard, not just locally |
| `Integration must generate a public key` | `APP_ID` doesn't match the key's App, or the key is a placeholder | Confirm `APP_ID` against the App's settings page; regenerate the key if needed |
| Webhook delivery shows a 404 with an HTML body | Webhook URL is missing `/api/github/webhooks` | Update the URL in the App's settings |
| Push has no effect, but delivery shows 200 | Errors inside the handler were being caught and logged, not surfaced | Check server logs for the specific step that failed (see the step-by-step `context.log.info` calls in `bot.js`) |
| Root URL (`/`) still shows Probot's default page | `probot run`'s built-in `/` → `/probot` redirect always wins over a custom route | Run a plain Express server instead (see `server.js`) |

## Extending

**Add a new analyzer** (e.g. new dependency detection, database schema changes):

1. Create `src/analyzers/<name>.js` with an `analyze<Name>Changes(files)` function returning change objects `{ type, confidence, reason, ... }`
2. Import and call it in `src/classifier.js`
3. Add a case in `src/readme/updater.js` → `applyOne()` to handle the new type

**Support a different framework** (Django, FastAPI, Rails):
- Add patterns to `src/analyzers/routes.js` → `ROUTE_RE`

**Adjust confidence thresholds:**
- Edit `src/classifier.js` → `CONFIDENCE`

## Contributing

1. Fork the repo
2. Create your branch: `git checkout -b feature/xyz`
3. Commit: `git commit -m "Add xyz"`
4. Push: `git push origin feature/xyz`
5. Open a Pull Request — README updates from this bot itself will show up as a comment on your PR once approved

## License

No license file is currently set for this repository. Until one is added, all rights are reserved by default — add a `LICENSE` file (e.g. MIT) if you want others to freely use or modify this project.

## Author

**[betheaakashhh](https://github.com/betheaakashhh)**

<!-- readme-sync-bot:checklist:start -->
## 📋 Recommended Sections Checklist

_The bot can't write these automatically — they need your judgment, not a diff. This list updates itself as you add them:_

- [ ] Acknowledgements
- [ ] Testing
<!-- readme-sync-bot:checklist:end -->
