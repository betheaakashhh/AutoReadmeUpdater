# README Sync Bot

A GitHub App that watches your repo and keeps `README.md` accurate automatically —
no more remembering to update docs after every API change, deleted feature, or
structural refactor.

## How it behaves

| Who pushes / acts | What happens |
|---|---|
| **Repo owner/admin pushes directly** to the default branch | Diff is analyzed immediately. If significant, README is auto-committed right away. |
| **Anyone else opens a Pull Request** | Nothing happens until a reviewer **approves** the PR. Once approved, the diff is analyzed and, if significant, the README update is committed (or, for forked PRs the bot can't push to, posted as a suggestion comment). |

"Significant" = new/removed public APIs, endpoints, functions, or classes;
changed signatures; new modules/folders that change project structure; new
required config/env vars; new dependencies; removed features; breaking
changes. Formatting, comments, tests, and typo fixes are ignored.

## How it works

1. GitHub sends a webhook (`push` or `pull_request_review`) to this app.
2. The app fetches the diff (`src/diff.js`).
3. Claude classifies whether the diff is README-worthy, and if so, regenerates
   the relevant parts of the README (`src/analyzer.js`).
4. The app commits the new README via the GitHub Contents API, or — for PRs
   from forks it can't push to — posts the suggested update as a PR comment
   (`src/index.js`).

## 1. Create the GitHub App

Go to **https://github.com/settings/apps/new** and configure:

- **Webhook URL**: wherever you deploy this app (e.g. `https://your-app.onrender.com/api/github/webhooks`)
- **Webhook secret**: generate any random string, save it for `.env`
- **Permissions**:
  - Contents: **Read & write**
  - Pull requests: **Read & write**
  - Metadata: **Read-only** (required by default)
- **Subscribe to events**: `Push`, `Pull request review`
- After creating the app, generate a **private key** (downloads a `.pem` file)
- Install the app on the repo(s) you want it to manage

## 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in:
- `APP_ID` — shown on your app's settings page
- `PRIVATE_KEY` — contents of the `.pem` file (keep the `\n` line breaks, or point Probot at the file path instead — see [Probot docs](https://probot.github.io/docs/configuration/))
- `WEBHOOK_SECRET` — the secret you set above
- `ANTHROPIC_API_KEY` — your Claude API key from [console.anthropic.com](https://console.anthropic.com)

## 3. Run it

```bash
npm install
npm start
```

For production, deploy to any Node host that gives you a public HTTPS URL
(Render, Railway, Fly.io, a small VPS, etc.) and point the GitHub App's
webhook URL at it.

## Configuration knobs (`.env`)

- `README_PATH` — defaults to `README.md`; set to e.g. `packages/api/README.md` for monorepos
- `STRICT_OWNER_ONLY` — `true` (default) means only the literal repo owner or an admin collaborator gets the instant auto-commit-on-push behavior; everyone else's changes always go through the PR-approval path
- `ANTHROPIC_MODEL` — swap models without touching code

## Notes & limitations

- Each significant push/PR costs two Claude API calls (classify + regenerate). Cost scales with diff size and README length.
- For PRs from forks, the bot can only push if the contributor checked "Allow edits by maintainers" — otherwise it leaves a comment with the suggested README instead.
- The bot ignores diffs to `README.md` itself, so it won't react to its own commits.
- To use a different AI provider, only `src/analyzer.js` needs to change — the rest of the app is provider-agnostic.
