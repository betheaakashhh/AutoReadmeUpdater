/**
 * Standalone landing page served at the root URL, replacing Probot's default
 * redirect-to-/probot page. Pure server-rendered HTML — no build step.
 */

const LANDING_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>README Sync Bot</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0B0E14;
    --panel: #11161F;
    --panel-border: #1D2430;
    --add: #4AC26B;
    --add-dim: #2C6B3F;
    --amber: #E3B341;
    --text: #E6EDF3;
    --muted: #7D8590;
  }

  * { box-sizing: border-box; }

  html { scroll-behavior: smooth; }

  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', -apple-system, sans-serif;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  .mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }

  .wrap {
    max-width: 860px;
    margin: 0 auto;
    padding: 0 24px;
  }

  /* ── Nav ─────────────────────────────────────────────────────────── */
  nav {
    padding: 28px 0;
    border-bottom: 1px solid var(--panel-border);
  }
  nav .wrap {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .brand .dot { color: var(--add); }
  nav a.source {
    color: var(--muted);
    text-decoration: none;
    font-size: 13px;
    font-family: 'IBM Plex Mono', monospace;
    border: 1px solid var(--panel-border);
    padding: 6px 12px;
    border-radius: 6px;
    transition: border-color 0.15s, color 0.15s;
  }
  nav a.source:hover { border-color: var(--muted); color: var(--text); }

  /* ── Hero ────────────────────────────────────────────────────────── */
  .hero { padding: 72px 0 56px; }
  .eyebrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 18px;
  }
  h1 {
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 600;
    font-size: clamp(28px, 4.2vw, 42px);
    line-height: 1.25;
    margin: 0 0 20px;
    max-width: 15ch;
  }
  .lede {
    color: var(--muted);
    font-size: 17px;
    max-width: 52ch;
    margin: 0 0 40px;
  }

  /* ── Diff block (signature visual #1) ───────────────────────────── */
  .diff {
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    overflow: hidden;
    opacity: 0;
    transform: translateY(6px);
    animation: rise 0.5s ease-out 0.15s forwards;
  }
  @media (prefers-reduced-motion: reduce) {
    .diff { animation: none; opacity: 1; transform: none; }
    .diff-line { animation: none !important; opacity: 1 !important; }
  }
  @keyframes rise { to { opacity: 1; transform: translateY(0); } }

  .diff-head {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--muted);
    padding: 10px 16px;
    border-bottom: 1px solid var(--panel-border);
  }
  .diff-body {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    padding: 4px 0;
  }
  .diff-line {
    display: flex;
    gap: 14px;
    padding: 3px 16px;
    white-space: pre;
    opacity: 0;
    animation: fadeIn 0.3s ease-out forwards;
  }
  .diff-line .ln { color: #3B4352; width: 4ch; text-align: right; flex-shrink: 0; user-select: none; }
  .diff-line.add { background: rgba(74, 194, 107, 0.08); color: var(--add); }
  .diff-line.ctx { color: var(--text); }
  .diff-line.hunk { color: var(--amber); }
  @keyframes fadeIn { to { opacity: 1; } }
  .diff-line:nth-child(1) { animation-delay: 0.35s; }
  .diff-line:nth-child(2) { animation-delay: 0.42s; }
  .diff-line:nth-child(3) { animation-delay: 0.49s; }
  .diff-line:nth-child(4) { animation-delay: 0.56s; }
  .diff-line:nth-child(5) { animation-delay: 0.63s; }
  .diff-line:nth-child(6) { animation-delay: 0.70s; }
  .diff-line:nth-child(7) { animation-delay: 0.77s; }

  /* ── Section headers ─────────────────────────────────────────────── */
  section { padding: 56px 0; border-top: 1px solid var(--panel-border); }
  .section-eyebrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 12px;
  }
  h2 {
    font-size: 22px;
    font-weight: 600;
    margin: 0 0 32px;
    max-width: 40ch;
  }

  /* ── Trigger cards ───────────────────────────────────────────────── */
  .triggers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  @media (max-width: 700px) { .triggers { grid-template-columns: 1fr; } }
  .trigger {
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    padding: 18px;
  }
  .trigger .pct {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    color: var(--add);
    margin: 0 0 8px;
  }
  .trigger p { margin: 0; font-size: 14px; color: var(--muted); }
  .trigger code {
    font-family: 'IBM Plex Mono', monospace;
    color: var(--text);
    background: #0B0E14;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 13px;
  }

  /* ── Confidence dial (signature visual #2) ──────────────────────── */
  .dial-wrap {
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    padding: 28px 24px 22px;
  }
  .dial-track {
    position: relative;
    height: 10px;
    border-radius: 5px;
    background: linear-gradient(
      to right,
      #262C38 0%, #262C38 70%,
      var(--amber) 70%, var(--amber) 90%,
      var(--add) 90%, var(--add) 100%
    );
    margin: 0 0 14px;
  }
  .dial-marks {
    position: relative;
    height: 34px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
  }
  .mark {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    text-align: center;
    color: var(--muted);
  }
  .mark .num { color: var(--text); display: block; margin-bottom: 2px; }
  .dial-legend {
    display: flex;
    gap: 22px;
    margin-top: 18px;
    flex-wrap: wrap;
    font-size: 13px;
    color: var(--muted);
  }
  .dial-legend span.sw { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 7px; }

  /* ── CTA ─────────────────────────────────────────────────────────── */
  .cta-row { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
  .btn {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 14px;
    text-decoration: none;
    padding: 12px 20px;
    border-radius: 6px;
    display: inline-block;
  }
  .btn-primary { background: var(--add); color: #06210F; font-weight: 600; }
  .btn-primary:hover { background: #5CD07D; }
  .btn-secondary { border: 1px solid var(--panel-border); color: var(--text); }
  .btn-secondary:hover { border-color: var(--muted); }

  footer {
    border-top: 1px solid var(--panel-border);
    padding: 28px 0 40px;
    color: var(--muted);
    font-size: 13px;
    font-family: 'IBM Plex Mono', monospace;
  }
</style>
</head>
<body>

<nav>
  <div class="wrap">
    <div class="brand"><span class="dot">＋</span> README SYNC BOT</div>
    <a class="source" href="https://github.com/betheaakashhh/AutoReadmeUpdater" target="_blank" rel="noopener">view source ↗</a>
  </div>
</nav>

<div class="hero wrap">
  <p class="eyebrow">no ai · no api key · no monthly cost</p>
  <h1>It reads your diff.<br>It edits your README.<br>Nothing else.</h1>
  <p class="lede">A GitHub App that watches every push and pull request, and surgically
  updates only the parts of README.md that a code change actually invalidates —
  using diff parsing, not a language model.</p>

  <div class="diff">
    <div class="diff-head">README.md</div>
    <div class="diff-body">
      <div class="diff-line hunk"><span class="ln"></span>@@ -41,0 +42,6 @@</div>
      <div class="diff-line ctx"><span class="ln">41</span>## What it ignores</div>
      <div class="diff-line add"><span class="ln">+42</span>+</div>
      <div class="diff-line add"><span class="ln">+43</span>+## API</div>
      <div class="diff-line add"><span class="ln">+44</span>+</div>
      <div class="diff-line add"><span class="ln">+45</span>+| Method | Endpoint          | Description |</div>
      <div class="diff-line add"><span class="ln">+46</span>+|--------|-------------------|-------------|</div>
      <div class="diff-line add"><span class="ln">+47</span>+| GET    | \`/api/orders\`     | —           |</div>
    </div>
  </div>
</div>

<section class="wrap">
  <p class="section-eyebrow">what triggers an update</p>
  <h2>Three kinds of changes get detected — everything else is left alone.</h2>
  <div class="triggers">
    <div class="trigger">
      <p class="pct">93% confidence</p>
      <p>A route is added or removed — <code>router.get('/x', ...)</code> matched directly against the diff.</p>
    </div>
    <div class="trigger">
      <p class="pct">97% confidence</p>
      <p>A variable is added or removed in <code>.env.example</code> — unambiguous line-by-line parsing.</p>
    </div>
    <div class="trigger">
      <p class="pct">75% confidence</p>
      <p>A new file lands inside a feature directory like <code>src/features/x/</code> — mentioned, not auto-applied.</p>
    </div>
  </div>
</section>

<section class="wrap">
  <p class="section-eyebrow">how it decides</p>
  <h2>Every detected change gets a confidence score. The score decides what happens to it.</h2>
  <div class="dial-wrap">
    <div class="dial-track"></div>
    <div class="dial-marks">
      <div class="mark" style="left: 0%;">0%<span class="num" style="display:none"></span></div>
      <div class="mark" style="left: 70%;"><span class="num">70%</span>suggest</div>
      <div class="mark" style="left: 90%;"><span class="num">90%</span>auto-apply</div>
      <div class="mark" style="left: 100%; transform: translateX(-100%);"><span class="num">100%</span></div>
    </div>
    <div class="dial-legend">
      <div><span class="sw" style="background:#262C38;"></span>ignored silently</div>
      <div><span class="sw" style="background:var(--amber);"></span>posted as a PR comment</div>
      <div><span class="sw" style="background:var(--add);"></span>committed automatically</div>
    </div>
  </div>
</section>

<section class="wrap">
  <p class="section-eyebrow">get started</p>
  <h2>Install it on a repo. It stays quiet until a diff actually matters.</h2>
  <div class="cta-row">
    <a class="btn btn-primary" href="https://github.com/apps" target="_blank" rel="noopener">Install the App →</a>
    <a class="btn btn-secondary" href="https://github.com/betheaakashhh/AutoReadmeUpdater" target="_blank" rel="noopener">Read the source</a>
  </div>
</section>

<footer>
  <div class="wrap">README Sync Bot — running on Probot. No data leaves your repo.</div>
</footer>

</body>
</html>`;

module.exports = { LANDING_PAGE_HTML };