/**
 * Server entry point — replaces `probot run ./src/index.js`.
 *
 * We run our own Express server (using Probot's documented
 * `createNodeMiddleware` pattern) instead of the `probot run` CLI, because
 * the CLI's built-in server hardcodes a "/" → "/probot" redirect that always
 * wins over any custom route mounted through getRouter(). Running our own
 * server is the only way to serve real content at the root URL.
 *
 * Webhook behaviour is unchanged — it all still lives in bot.js.
 */

require('dotenv').config();

const path = require('path');
const express = require('express');
const { createNodeMiddleware, createProbot } = require('probot');

const botApp = require('./bot');
const { LANDING_PAGE_HTML } = require('./landing');

const probot = createProbot({
  env: {
    APP_ID:         process.env.APP_ID,
    PRIVATE_KEY:    process.env.PRIVATE_KEY,
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  },
});

const webhookMiddleware = createNodeMiddleware(botApp, {
  webhooksPath: '/api/github/webhooks',
  probot,
});

const server = express();

// Webhook handling — only intercepts POST /api/github/webhooks, passes
// everything else through to the routes below.
server.use(webhookMiddleware);

// ── Static assets (logo, etc.) — assets/ lives one level up from src/,

server.use('/assets', express.static(path.join(__dirname, '../assets')));

// ── Landing page — the actual root URL now ─────────────────────────────────
server.get('/', (req, res) => {
  res.type('html').send(LANDING_PAGE_HTML);
});

// Simple liveness check, useful for uptime pingers / Render health checks.
server.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`README Sync Bot listening on port ${port}`);
});