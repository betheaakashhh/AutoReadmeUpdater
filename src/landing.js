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
  .hero-top {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 0 0 18px;
  }
  .hero-top .logo {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    border: 1px solid var(--panel-border);
    background: var(--panel);
    object-fit: cover;
    flex-shrink: 0;
  }
  .eyebrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0;
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

  /* ── Live demo ("see it work") ──────────────────────────────────── */
  .demo-grid {
    display: grid;
    grid-template-columns: 200px 1fr 1fr;
    gap: 14px;
  }
  @media (max-width: 900px) {
    .demo-grid { grid-template-columns: 1fr; }
  }
  .demo-panel {
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--panel-border);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--muted);
  }
  .panel-head select {
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    padding: 4px 6px;
  }
  .tree-actions { display: flex; gap: 6px; }
  .tree-btn {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--muted);
    background: transparent;
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    padding: 3px 7px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .tree-btn:hover { border-color: var(--add); color: var(--add); }

  .file-tree {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    padding: 10px 8px;
    min-height: 220px;
    max-height: 320px;
    overflow-y: auto;
  }
  .tree-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 6px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--text);
    white-space: nowrap;
  }
  .tree-item:hover { background: rgba(255,255,255,0.04); }
  .tree-item.selected { background: rgba(74, 194, 107, 0.1); color: var(--add); }
  .tree-item .tree-icon { color: var(--muted); flex-shrink: 0; width: 12px; }
  .tree-item .tree-name { flex: 1; overflow: hidden; text-overflow: ellipsis; }
  .tree-item .tree-del {
    color: var(--muted);
    opacity: 0;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    padding: 0 2px;
    flex-shrink: 0;
  }
  .tree-item:hover .tree-del { opacity: 1; }
  .tree-item .tree-del:hover { color: #E5534B; }

  .tree-input {
    flex: 1;
    min-width: 0;
    background: var(--bg);
    border: 1px solid var(--add);
    border-radius: 4px;
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    padding: 2px 6px;
    outline: none;
  }
  .tree-confirm {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }
  .tree-confirm .tc-label {
    color: var(--muted);
    font-size: 11.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 1;
  }
  .tree-confirm button {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    border: 1px solid var(--panel-border);
    background: transparent;
    border-radius: 4px;
    padding: 2px 7px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .tree-confirm .tc-yes { color: #E5534B; border-color: #6b2b28; }
  .tree-confirm .tc-yes:hover { background: rgba(229,83,75,0.1); }
  .tree-confirm .tc-no { color: var(--muted); }
  .tree-confirm .tc-no:hover { color: var(--text); border-color: var(--muted); }

  .code-editor {
    flex: 1;
    width: 100%;
    min-height: 220px;
    resize: vertical;
    background: var(--bg);
    color: var(--text);
    border: none;
    outline: none;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    line-height: 1.6;
    padding: 14px;
    tab-size: 2;
  }

  .preview-badge {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 2px 8px;
    border-radius: 10px;
    border: 1px solid var(--panel-border);
    color: var(--muted);
    white-space: nowrap;
  }
  .preview-badge.is-updated { color: var(--add); border-color: var(--add-dim); background: rgba(74,194,107,0.08); }
  .preview-badge.is-suggested { color: var(--amber); border-color: #6b5827; background: rgba(227,179,65,0.08); }

  .readme-preview {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    line-height: 1.7;
    padding: 14px 16px;
    min-height: 220px;
    max-height: 320px;
    overflow-y: auto;
    white-space: pre-wrap;
  }
  .readme-preview .rp-added { background: rgba(74, 194, 107, 0.08); color: var(--add); display: block; margin: 0 -16px; padding: 0 16px; }
  .readme-preview .rp-muted { color: var(--muted); }
  .readme-preview .rp-marker-inline { color: var(--add-dim); }
  .readme-preview .rp-added.rp-marker { color: var(--add-dim); }
  .readme-preview .rp-note {
    margin-top: 10px;
    padding: 8px 10px;
    border-left: 2px solid var(--amber);
    color: var(--amber);
    background: rgba(227,179,65,0.06);
    white-space: normal;
  }

  .terminal-panel { margin-top: 14px; }
  .terminal-body {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    padding: 12px 14px;
    min-height: 110px;
    max-height: 200px;
    overflow-y: auto;
    color: var(--muted);
  }
  .terminal-body .tl-cmd { color: var(--text); }
  .terminal-body .tl-ok { color: var(--add); }
  .terminal-body .tl-err { color: #E5534B; }
  .terminal-body .tl-info { color: var(--amber); }
  .terminal-input-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-top: 1px solid var(--panel-border);
  }
  .terminal-prompt { color: var(--add); font-family: 'IBM Plex Mono', monospace; font-size: 13px; }
  .terminal-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
  }
  .terminal-input::placeholder { color: #3B4352; }
  .run-btn {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--add);
    background: rgba(74,194,107,0.08);
    border: 1px solid var(--add-dim);
    border-radius: 4px;
    padding: 5px 10px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .run-btn:hover { background: rgba(74,194,107,0.16); }
  .demo-hint {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--muted);
    margin: 14px 2px 0;
  }
  .demo-hint code {
    color: var(--text);
    background: var(--bg);
    border: 1px solid var(--panel-border);
    padding: 1px 5px;
    border-radius: 4px;
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

  /* ── Permissions table ("Who Gets What") ────────────────────────── */
  .perm-wrap {
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    overflow: hidden;
  }
  .perm-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
  }
  .perm-table th, .perm-table td {
    text-align: left;
    padding: 14px 18px;
    border-bottom: 1px solid var(--panel-border);
  }
  .perm-table th {
    color: var(--muted);
    font-weight: 500;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: rgba(255, 255, 255, 0.02);
  }
  .perm-table td { color: var(--muted); }
  .perm-table td:first-child { color: var(--text); font-weight: 500; }
  .perm-table tr:last-child td { border-bottom: none; }
  @media (max-width: 700px) {
    .perm-table { font-size: 12px; }
    .perm-table th, .perm-table td { padding: 12px; }
  }
  .perm-note {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--muted);
    margin: 14px 2px 0;
  }
  .perm-note code {
    color: var(--text);
    background: var(--panel);
    border: 1px solid var(--panel-border);
    padding: 1px 5px;
    border-radius: 4px;
  }

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
    <div class="brand"><span class="dot">＋</span> AutoReadmeUpdater</div>
    <a class="source" href="https://github.com/betheaakashhh/AutoReadmeUpdater" target="_blank" rel="noopener">view source ↗</a>
    <a class="source" href="https://github.com/betheaakashhh" target="_blank" rel="noopener">@betheaakashhh ↗</a>
  </div>
</nav>

<div class="hero wrap">
  <div class="hero-top">
    <!-- TODO: swap this src for your own logo path once you have one, e.g. /logo.png -->
    <img class="logo" src="/assets/logo.png" alt="AutoReadmeUpdater logo" />
    <p class="eyebrow">no ai · no api key · no monthly cost</p>
  </div>
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
  <p class="section-eyebrow">see it work</p>
  <h2>Nothing updates until you push — walk through the flow yourself.</h2>

  <div class="demo-grid">
    <div class="demo-panel">
      <div class="panel-head">
        <span>files</span>
        <div class="tree-actions">
          <button class="tree-btn" id="newFileBtn" type="button">+ file</button>
          <button class="tree-btn" id="newFolderBtn" type="button">+ folder</button>
        </div>
      </div>
      <div class="file-tree" id="fileTree"></div>
    </div>

    <div class="demo-panel">
      <div class="panel-head">
        <select id="langSelect">
          <option value="javascript" selected>JavaScript</option>
          <option value="python">Python</option>
          <option value="other">Other</option>
        </select>
        <span id="activeFileLabel">src/analyzers/routes.js</span>
      </div>
      <textarea class="code-editor" id="codeEditor" spellcheck="false"></textarea>
    </div>

    <div class="demo-panel">
      <div class="panel-head">
        <span>README.md</span>
        <span class="preview-badge" id="previewBadge">not pushed yet</span>
      </div>
      <div class="readme-preview" id="readmePreview"></div>
    </div>
  </div>

  <div class="demo-panel terminal-panel">
    <div class="panel-head">
      <span>terminal</span>
      <span>git add . → git commit → git push</span>
    </div>
    <div class="terminal-body" id="terminalBody"></div>
    <div class="terminal-input-row">
      <span class="terminal-prompt">$</span>
      <input class="terminal-input" id="terminalInput" type="text" placeholder="git add ." autocomplete="off" spellcheck="false" />
      <button class="run-btn" id="terminalRunBtn" type="button">Run ↵</button>
    </div>
  </div>

  <p class="demo-hint">Runs entirely in your browser. Double-click a file or folder name to rename it, use the × to delete it (with a confirm step), edit the code on the left, then walk through <code>git add .</code> → <code>git commit -m "..."</code> → <code>git push</code> — the README panel only reacts after the push, same as the real bot.</p>
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
  <p class="section-eyebrow">who gets what</p>
  <h2>Same detection, different actions — your role decides what happens next.</h2>
  <div class="perm-wrap">
    <table class="perm-table">
      <thead>
        <tr>
          <th>Actor</th>
          <th>On push</th>
          <th>On PR approval</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Repo owner / admin</td>
          <td>README committed immediately</td>
          <td>README committed to the PR branch</td>
        </tr>
        <tr>
          <td>Contributor (non-admin)</td>
          <td>Ignored — must open a PR</td>
          <td>README committed after approval</td>
        </tr>
        <tr>
          <td>Fork contributor</td>
          <td>—</td>
          <td>Suggested as a PR comment (can't push to a fork)</td>
        </tr>
      </tbody>
    </table>
  </div>
  <p class="perm-note">Controlled by <code>STRICT_OWNER_ONLY</code> (default <code>true</code>) — turn it off to let approved PRs from any contributor auto-commit.</p>
</section>

<section class="wrap">
  <p class="section-eyebrow">get started</p>
  <h2>Install it on a repo. It stays quiet until a diff actually matters.</h2>
  <div class="cta-row">
    <a class="btn btn-primary" href="https://github.com/apps/AutoReadmeUpdater/installations/new" target="_blank" rel="noopener">Install the App →</a>
    <a class="btn btn-secondary" href="https://github.com/betheaakashhh/AutoReadmeUpdater" target="_blank" rel="noopener">Read the source</a>
  </div>
</section>

<footer>
  <div class="wrap">README Sync Bot — running on Probot. No data leaves your repo.</div>
</footer>

<script>
(function () {
  function safeInit(label, fn) {
    try {
      fn();
    } catch (err) {
      if (window.console && console.error) {
        console.error('[demo:' + label + ']', err);
      }
    }
  }

  var NL = String.fromCharCode(10);
  var ROUTE_RE = /\\.(get|post|put|delete|patch)\\(\\s*['"]([^'"]+)['"]/i;

  var DEFAULT_CODE = [
    "const router = require('express').Router();",
    "",
    "// New route added here",
    "router.get('/api/orders/:id/status', getOrderStatusHandler);",
    "",
    "module.exports = router;",
    ""
  ].join(NL);

  var initialTree = [
    { id: 'f1', type: 'folder', name: 'src', open: true, children: [
      { id: 'f2', type: 'file', name: 'server.js' },
      { id: 'f3', type: 'file', name: 'bot.js' },
      { id: 'f4', type: 'file', name: 'landing.js' },
      { id: 'f5', type: 'file', name: 'permissions.js' },
      { id: 'f6', type: 'file', name: 'classifier.js' },
      { id: 'f7', type: 'folder', name: 'analyzers', open: true, children: [
        { id: 'f8', type: 'file', name: 'routes.js' },
        { id: 'f9', type: 'file', name: 'env.js' },
        { id: 'f10', type: 'file', name: 'features.js' }
      ] },
      { id: 'f11', type: 'folder', name: 'readme', open: true, children: [
        { id: 'f12', type: 'file', name: 'parser.js' },
        { id: 'f13', type: 'file', name: 'generators.js' },
        { id: 'f14', type: 'file', name: 'updater.js' }
      ] }
    ] },
    { id: 'f15', type: 'file', name: 'README.md' }
  ];

  var tree = JSON.parse(JSON.stringify(initialTree));
  var selectedFolderId = 'f1';
  var uidCounter = 100;
  var dirty = true;
  var staged = false;
  var committed = false;
  var lastFeatureFolder = null;
  var creating = null;
  var renamingId = null;
  var confirmDeleteId = null;

  var fileTreeEl = document.getElementById('fileTree');
  var codeEditorEl = document.getElementById('codeEditor');
  var langSelectEl = document.getElementById('langSelect');
  var activeFileLabelEl = document.getElementById('activeFileLabel');
  var previewBadgeEl = document.getElementById('previewBadge');
  var readmePreviewEl = document.getElementById('readmePreview');
  var terminalBodyEl = document.getElementById('terminalBody');
  var terminalInputEl = document.getElementById('terminalInput');
  var terminalRunBtn = document.getElementById('terminalRunBtn');
  var newFileBtn = document.getElementById('newFileBtn');
  var newFolderBtn = document.getElementById('newFolderBtn');

  function findNode(nodes, id) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return nodes[i];
      if (nodes[i].children) {
        var found = findNode(nodes[i].children, id);
        if (found) return found;
      }
    }
    return null;
  }

  function removeNode(nodes, id) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) { nodes.splice(i, 1); return true; }
      if (nodes[i].children && removeNode(nodes[i].children, id)) return true;
    }
    return false;
  }

  function isValidFolderId(id) {
    if (!id) return false;
    var n = findNode(tree, id);
    return !!(n && n.type === 'folder');
  }

  function markDirty() {
    dirty = true;
    staged = false;
    committed = false;
    updateBadge('not pushed yet', null);
  }

  function updateBadge(text, kind) {
    previewBadgeEl.textContent = text;
    previewBadgeEl.className = 'preview-badge' + (kind ? ' is-' + kind : '');
  }

  function startCreate(parentId, type) {
    creating = { parentId: parentId, type: type };
    if (parentId) {
      var p = findNode(tree, parentId);
      if (p) p.open = true;
    }
    renderTree();
  }

  function commitCreate(rawName) {
    var name = rawName.trim();
    var info = creating;
    creating = null;
    if (!name || !info) { renderTree(); return; }
    var node = info.type === 'folder'
      ? { id: 'n' + (uidCounter++), type: 'folder', name: name, open: true, children: [] }
      : { id: 'n' + (uidCounter++), type: 'file', name: name };
    var parent = info.parentId ? findNode(tree, info.parentId) : null;
    if (parent) {
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      tree.push(node);
    }
    if (info.type === 'folder' && parent && parent.name === 'src') {
      lastFeatureFolder = name;
    }
    markDirty();
    renderTree();
  }

  function commitRename(node, rawName) {
    var name = rawName.trim();
    renamingId = null;
    if (name && name !== node.name) {
      node.name = name;
      markDirty();
    }
    renderTree();
  }

  function renderTree() {
    fileTreeEl.innerHTML = '';
    renderNodes(tree, 0, fileTreeEl, null);
    if (creating && creating.parentId === null) {
      renderCreateRow(fileTreeEl, 0);
    }
  }

  function renderCreateRow(container, depth) {
    var row = document.createElement('div');
    row.className = 'tree-item';
    row.style.paddingLeft = (10 + depth * 14) + 'px';

    var icon = document.createElement('span');
    icon.className = 'tree-icon';
    icon.textContent = creating.type === 'folder' ? '▸' : '·';
    row.appendChild(icon);

    var input = document.createElement('input');
    input.className = 'tree-input';
    input.type = 'text';
    input.placeholder = creating.type === 'folder' ? 'folder name' : 'file name';
    input.autocomplete = 'off';
    input.spellcheck = false;

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitCreate(input.value);
      } else if (e.key === 'Escape') {
        creating = null;
        renderTree();
      }
    });
    input.addEventListener('blur', function () {
      setTimeout(function () {
        if (creating) { creating = null; renderTree(); }
      }, 0);
    });

    row.appendChild(input);
    container.appendChild(row);
    setTimeout(function () { input.focus(); }, 0);
  }

  function renderConfirmDeleteRow(container, depth, node) {
    var row = document.createElement('div');
    row.className = 'tree-item';
    row.style.paddingLeft = (10 + depth * 14) + 'px';

    var wrap = document.createElement('div');
    wrap.className = 'tree-confirm';

    var label = document.createElement('span');
    label.className = 'tc-label';
    label.textContent = 'delete "' + node.name + '"?';
    wrap.appendChild(label);

    var yes = document.createElement('button');
    yes.type = 'button';
    yes.className = 'tc-yes';
    yes.textContent = 'delete';
    yes.addEventListener('click', function (e) {
      e.stopPropagation();
      removeNode(tree, node.id);
      if (!isValidFolderId(selectedFolderId)) selectedFolderId = null;
      confirmDeleteId = null;
      markDirty();
      renderTree();
    });
    wrap.appendChild(yes);

    var no = document.createElement('button');
    no.type = 'button';
    no.className = 'tc-no';
    no.textContent = 'cancel';
    no.addEventListener('click', function (e) {
      e.stopPropagation();
      confirmDeleteId = null;
      renderTree();
    });
    wrap.appendChild(no);

    row.appendChild(wrap);
    container.appendChild(row);
  }

  function renderRenameRow(container, depth, node) {
    var row = document.createElement('div');
    row.className = 'tree-item';
    row.style.paddingLeft = (10 + depth * 14) + 'px';

    var icon = document.createElement('span');
    icon.className = 'tree-icon';
    icon.textContent = node.type === 'folder' ? (node.open ? '▾' : '▸') : '·';
    row.appendChild(icon);

    var input = document.createElement('input');
    input.className = 'tree-input';
    input.type = 'text';
    input.value = node.name;
    input.autocomplete = 'off';
    input.spellcheck = false;

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitRename(node, input.value);
      } else if (e.key === 'Escape') {
        renamingId = null;
        renderTree();
      }
    });
    input.addEventListener('blur', function () {
      setTimeout(function () {
        if (renamingId === node.id) { commitRename(node, input.value); }
      }, 0);
    });

    row.appendChild(input);
    container.appendChild(row);
    setTimeout(function () { input.focus(); input.select(); }, 0);
  }

  function renderNodes(nodes, depth, container, parentId) {
    nodes.forEach(function (node) {
      if (node.id === renamingId) {
        renderRenameRow(container, depth, node);
      } else if (node.id === confirmDeleteId) {
        renderConfirmDeleteRow(container, depth, node);
      } else {
        var row = document.createElement('div');
        row.className = 'tree-item' + (node.id === selectedFolderId ? ' selected' : '');
        row.style.paddingLeft = (10 + depth * 14) + 'px';

        var icon = document.createElement('span');
        icon.className = 'tree-icon';
        icon.textContent = node.type === 'folder' ? (node.open ? '▾' : '▸') : '·';
        row.appendChild(icon);

        var name = document.createElement('span');
        name.className = 'tree-name';
        name.textContent = node.name;
        name.addEventListener('dblclick', function (e) {
          e.stopPropagation();
          renamingId = node.id;
          renderTree();
        });
        row.appendChild(name);

        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'tree-del';
        del.textContent = '×';
        del.addEventListener('click', function (e) {
          e.stopPropagation();
          confirmDeleteId = node.id;
          renderTree();
        });
        row.appendChild(del);

        row.addEventListener('click', function () {
          if (node.type === 'folder') {
            node.open = !node.open;
            selectedFolderId = node.id;
            renderTree();
          }
        });

        container.appendChild(row);

        if (node.type === 'folder' && node.open) {
          if (node.children && node.children.length) {
            renderNodes(node.children, depth + 1, container, node.id);
          }
          if (creating && creating.parentId === node.id) {
            renderCreateRow(container, depth + 1);
          }
        }
      }
    });
  }

  var BASE_README_LINES = [
    '## Folder Structure',
    '',
    'src/',
    '├── server.js          Express entry point',
    '├── bot.js             Push & PR event handlers',
    '├── landing.js         Landing page HTML',
    '├── permissions.js     Owner / admin check',
    '├── classifier.js      Scores & routes each change',
    '├── analyzers/',
    '│   ├── routes.js      Route change detection',
    '│   ├── env.js         .env.example detection',
    '│   └── features.js    New feature directories',
    '└── readme/',
    '    ├── parser.js      Splits README by heading',
    '    ├── generators.js  Markdown templates',
    '    └── updater.js     Applies the edit',
    '',
    '## What it ignores',
    '',
    '- Test files, CI config, CHANGELOG',
    '- node_modules, dist, build',
    ''
  ];

  var apiRoutes = [
    { method: 'GET', path: '/api/orders' }
  ];

  function renderPreviewBase() {
    readmePreviewEl.innerHTML = '';
    BASE_README_LINES.forEach(function (line) {
      var div = document.createElement('div');
      div.className = 'rp-muted';
      div.textContent = line || String.fromCharCode(160);
      readmePreviewEl.appendChild(div);
    });
  }

  function appendPreviewLine(text, cls) {
    var div = document.createElement('div');
    div.className = cls;
    div.textContent = text || String.fromCharCode(160);
    readmePreviewEl.appendChild(div);
  }

  function appendHeadingWithMarker(headingText, markerText) {
    var div = document.createElement('div');
    div.className = 'rp-added';
    var headSpan = document.createElement('span');
    headSpan.textContent = headingText;
    div.appendChild(headSpan);
    var markSpan = document.createElement('span');
    markSpan.className = 'rp-marker-inline';
    markSpan.textContent = ' ' + markerText;
    div.appendChild(markSpan);
    readmePreviewEl.appendChild(div);
  }

  // Mirrors how real doc-sync bots keep updates idempotent: everything the
  // bot owns lives between a start/end marker comment, so a later push
  // updates the same block in place instead of appending a duplicate one.
  function renderPreviewWithApiSection() {
    renderPreviewBase();
    if (!apiRoutes.length) return;
    appendPreviewLine('', 'rp-added');
    appendHeadingWithMarker('## API', '<!-- readme-sync-bot:start:api -->');
    appendPreviewLine('', 'rp-added');
    appendPreviewLine('| Method | Endpoint | Description |', 'rp-added');
    appendPreviewLine('|--------|----------|-------------|', 'rp-added');
    apiRoutes.forEach(function (r) {
      appendPreviewLine('| ' + r.method + ' | ' + r.path + ' | — |', 'rp-added');
    });
    appendPreviewLine('', 'rp-added');
    appendPreviewLine('<!-- readme-sync-bot:end:api -->', 'rp-added rp-marker');
  }

  function renderPreviewWithNote(text) {
    renderPreviewWithApiSection();
    var note = document.createElement('div');
    note.className = 'rp-note';
    note.textContent = text;
    readmePreviewEl.appendChild(note);
  }

  function detectRoute(code) {
    var m = code.match(ROUTE_RE);
    if (!m) return null;
    return { method: m[1].toUpperCase(), path: m[2] };
  }

  function logLine(text, cls) {
    var line = document.createElement('div');
    line.className = cls || '';
    line.textContent = text;
    terminalBodyEl.appendChild(line);
    terminalBodyEl.scrollTop = terminalBodyEl.scrollHeight;
  }

  function handleCommand(raw) {
    var cmd = raw.trim();
    if (!cmd) return;
    logLine('$ ' + cmd, 'tl-cmd');

    var lower = cmd.toLowerCase();

    if (lower.indexOf('git add') === 0) {
      if (!dirty) { logLine('nothing to commit, working tree clean', 'tl-err'); return; }
      staged = true;
      logLine('changes staged', 'tl-ok');
      return;
    }
    if (lower.indexOf('git commit') === 0) {
      if (!staged) { logLine('nothing added to commit (use "git add" first)', 'tl-err'); return; }
      committed = true;
      logLine('committed', 'tl-ok');
      return;
    }
    if (lower.indexOf('git push') === 0) {
      if (!committed) { logLine('failed to push — commit your changes first', 'tl-err'); return; }
      runPushFlow();
      return;
    }
    logLine('command not recognized — try: git add . / git commit -m "..." / git push', 'tl-err');
  }

  function runPushFlow() {
    logLine('pushed to origin/main', '');
    logLine('webhook received: push', '');
    logLine('analyzing diff...', '');

    var lang = langSelectEl.value;
    var route = lang === 'javascript' ? detectRoute(codeEditorEl.value) : null;

    if (route) {
      var existing = null;
      for (var i = 0; i < apiRoutes.length; i++) {
        if (apiRoutes[i].path === route.path && apiRoutes[i].method === route.method) { existing = apiRoutes[i]; break; }
      }
      if (existing) {
        existing.method = route.method;
        logLine('detected: ' + route.method + ' ' + route.path + ' (93% confidence, already documented)', 'tl-info');
        logLine('existing entry updated in place — inside the readme-sync-bot:api markers', 'tl-ok');
      } else {
        apiRoutes.push({ method: route.method, path: route.path });
        logLine('detected: ' + route.method + ' ' + route.path + ' (93% confidence)', 'tl-info');
        logLine('README.md updated & committed — inside readme-sync-bot:api markers', 'tl-ok');
      }
      renderPreviewWithApiSection();
      updateBadge('auto-committed · 93%', 'updated');
    } else if (lastFeatureFolder) {
      logLine('detected: new directory src/' + lastFeatureFolder + '/ (75% confidence)', 'tl-info');
      logLine('posted as a PR comment — below the auto-apply threshold', 'tl-info');
      renderPreviewWithNote('New feature directory src/' + lastFeatureFolder + '/ noticed — mention it in the README? (75% confidence, not auto-applied)');
      updateBadge('suggested · 75%', 'suggested');
    } else if (lang !== 'javascript') {
      logLine('detection is tuned for JavaScript route handlers right now', 'tl-info');
      logLine('README.md left untouched', '');
      renderPreviewWithApiSection();
      updateBadge('no change detected', null);
    } else {
      logLine('no route or feature-directory change detected', 'tl-info');
      logLine('README.md left untouched', '');
      renderPreviewWithApiSection();
      updateBadge('no change detected', null);
    }

    dirty = false;
    staged = false;
    committed = false;
    lastFeatureFolder = null;
  }

  function submitTerminal() {
    var val = terminalInputEl.value;
    terminalInputEl.value = '';
    handleCommand(val);
    terminalInputEl.focus();
  }

  safeInit('editor', function () {
    codeEditorEl.value = DEFAULT_CODE;
    codeEditorEl.addEventListener('input', markDirty);
    langSelectEl.addEventListener('change', function () {
      activeFileLabelEl.textContent = langSelectEl.value === 'javascript'
        ? 'src/analyzers/routes.js'
        : (langSelectEl.value === 'python' ? 'src/analyzers/routes.py' : 'src/analyzers/routes.txt');
      markDirty();
    });
  });

  safeInit('tree-buttons', function () {
    newFileBtn.addEventListener('click', function () { startCreate(selectedFolderId, 'file'); });
    newFolderBtn.addEventListener('click', function () { startCreate(selectedFolderId, 'folder'); });
  });

  safeInit('tree-render', function () {
    renderTree();
    renderPreviewWithApiSection();
  });

  safeInit('terminal', function () {
    logLine('# demo ready — try: git add .  then  git commit -m "..."  then  git push', 'tl-info');
    terminalInputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitTerminal();
      }
    });
    terminalRunBtn.addEventListener('click', submitTerminal);
  });
})();
</script>

</body>
</html>`;

module.exports = { LANDING_PAGE_HTML };