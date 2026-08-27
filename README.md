# README Auto Updater

[![Docs: Auto-updated](https://img.shields.io/badge/docs-auto--updated-4AC26B?style=flat-square)](https://github.com/betheaakashhh/AutoReadmeUpdater)
[![Built with Probot](https://img.shields.io/badge/built%20with-probot-E3B341?style=flat-square)](https://probot.github.io/)
[![No AI](https://img.shields.io/badge/no-AI%20API-0B0E14?style=flat-square)](https://github.com/betheaakashhh/AutoReadmeUpdater)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-333?style=flat-square)](package.json)


A GitHub App that watches your repo and surgically updates `README.md` when meaningful code changes happen — **no AI API, no monthly cost, no guessing.**

It uses diff parsing and code analysis to detect real changes, then updates only the affected section of your README.

---

## How it works

```
Git push / PR approved
        │
        ▼
  Get changed files
  (with patches from GitHub API)
        │
        ▼
┌───────────────────────────────┐
│       Change Classifier        │
│                                │
│  routes.js  → API routes       │
│  env.js     → env variables    │
│  features.js→ new modules      │
└──────────────┬────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
 Ignore               Significant
 (low confidence)     (≥ 90% confidence)
                          │
                          ▼
                 Parse README sections
                          │
                          ▼
                 Find affected section
                 (API / Config / etc.)
                          │
                          ▼
                 Update ONLY that section
                          │
                          ▼
                 Commit or PR comment
```

---

## What it detects

| What changed | Detected how | Confidence | README action |
|---|---|---|---|
| New `router.get('/path', ...)` | Regex on diff | 93% | Add to API section |
| Removed route | Regex on diff | 93% | Remove from API section |
| Auth middleware added to route | Keyword match on diff | 88% | Add 🔒 badge to entry |
| New `.env.example` variable | Diff line parsing | 97% | Add row to config table |
| Removed `.env.example` variable | Diff line parsing | 97% | Remove row from config table |
| New `src/features/x/` directory | File path heuristic | 75% | Mention in PR comment |

Changes under 90% confidence are **never auto-committed** — they're mentioned in a PR comment for manual review.

---

## What it ignores

- Test files (`*.test.js`, `*.spec.ts`, `__tests__/`)
- CI / workflow files (`.github/`, `jest.config.*`, `.eslintrc`)
- Formatting / comments / variable renames
- Any change to `README.md` itself (no feedback loops)

---

## Who gets what

| Actor | Push event | PR approved |
|---|---|---|
| **Repo owner / admin** | README auto-committed immediately | README auto-committed to PR branch |
| **Contributor (non-admin)** | Ignored on push (must open PR) | README auto-committed after approval |
| **Fork contributor** | — | Suggested changes posted as PR comment |

---

## Setup

### 1. Register the GitHub App

Go to **https://github.com/settings/apps/new** and fill in:

- **Webhook URL** — your deployment URL + `/api/github/webhooks`
  (e.g. `https://your-app.onrender.com/api/github/webhooks`)
- **Webhook secret** — any random string, save it
- **Repository permissions:**
  - Contents: **Read & write**
  - Pull requests: **Read & write**
  - Metadata: **Read-only** (auto-selected)
- **Subscribe to events:** `Push`, `Pull request review`

After creating the app:
1. Click **Generate a private key** → downloads a `.pem` file
2. Install the app on the repos you want it to manage

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
APP_ID=         # shown on your app's settings page
PRIVATE_KEY=    # full contents of the .pem file (keep \n line breaks)
WEBHOOK_SECRET= # the secret you set above
```

### 3. Run

```bash
npm install
npm start
```

Deploy to any Node.js host that can receive HTTPS webhooks (Render, Railway, Fly.io, a small VPS). The free tier on most of these is enough.

---

## Configuration (`env`)

| Variable | Description | Default |
|---|---|---|
| `README_PATH` | Path to README to update | `README.md` |
| `STRICT_OWNER_ONLY` | Only owner/admin direct pushes auto-commit | `true` |
| `PORT` | Local server port | `3000` |

---

## Project structure

```
src/
├── index.js              Main Probot handler (push + PR review events)
├── permissions.js        Owner / admin check
├── classifier.js         Orchestrates all analyzers
├── analyzers/
│   ├── routes.js         Express / Fastify route change detection
│   ├── env.js            .env.example change detection
│   └── features.js       New feature directory detection
└── readme/
    ├── parser.js         Split README into sections by heading
    ├── generators.js     Markdown templates (table rows, headings, sections)
    └── updater.js        Surgical per-section update logic
```

---

## Extending

**Add a new analyzer** (e.g. database schema changes):

1. Create `src/analyzers/schema.js` with an `analyzeSchemaChanges(files)` function that returns change objects `{ type, confidence, reason, ... }`
2. Import and call it in `src/classifier.js`
3. Add a case in `src/readme/updater.js` → `applyOne()` to handle the new type

**Support a different framework** (Django, FastAPI, Rails):
- Add patterns to `src/analyzers/routes.js` → `ROUTE_RE`

**Adjust confidence thresholds**:
- Edit `src/classifier.js` → `CONFIDENCE` object

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/textdata` | — |
| GET | `/` | — |
| GET | `/x` | — |
| GET | `/` | — |
| GET | `/healthz` | — |
