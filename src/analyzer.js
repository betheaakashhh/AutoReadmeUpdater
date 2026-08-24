/**
 * Talks to Claude to (1) decide whether a diff is significant enough to
 * warrant a README update, and (2) regenerate the README when it is.
 *
 * Swappable: to use a different provider, just change the URL/headers/body
 * shape in callClaude() below — the rest of the bot doesn't care.
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

async function callClaude(systemPrompt, userPrompt) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const textBlock = (data.content || []).find((b) => b.type === "text");
  return textBlock ? textBlock.text : "";
}

/**
 * Step 1 — classify: is this diff worth documenting?
 * Significant: new/removed public APIs, endpoints, functions, classes;
 * changed signatures; new modules/folders that change project structure;
 * new required config/env vars; new dependencies that affect setup;
 * removed features; breaking changes.
 * Not significant: formatting, comments, tests, internal refactors with
 * no external effect, typo fixes.
 */
async function classifyChange(diffText) {
  const system = `You are a senior engineer reviewing a git diff to decide if it contains a change significant enough to require a README.md update.

Significant changes include: new or removed public APIs/endpoints/functions/classes, changed function signatures, new modules or folders that change project structure, new required config/env vars, new dependencies that affect setup, removed features, breaking changes.

Not significant: formatting, comments, tests, minor bugfixes with no external effect, internal refactors, typo fixes.

Respond with ONLY raw JSON, no prose, no markdown fences:
{"significant": true|false, "reason": "short reason", "summary": "one sentence summary of the change for a changelog"}`;

  const raw = await callClaude(system, `Diff:\n\n${diffText}`);
  try {
    return JSON.parse(raw.trim());
  } catch {
    return { significant: false, reason: "unparseable classification response", summary: "" };
  }
}

/**
 * Step 2 — regenerate: produce the full updated README given the diff.
 */
async function regenerateReadme(currentReadme, diffText, changeSummary) {
  const system = `You update README.md files to stay accurate after code changes.

Rules:
- Preserve the existing structure, tone, and section order of the README as much as possible.
- Only modify the parts affected by the diff (e.g. API reference, usage examples, installation/config steps, feature list, changelog section if present).
- Do not invent features, APIs, or details that are not evidenced by the diff.
- Do not remove unrelated existing content.
- If there is no existing README, create a minimal, sensible one based only on what the diff shows.
- Return ONLY the full updated README.md content — no explanation, no markdown fences wrapping the whole file.`;

  const user = `Change summary: ${changeSummary}

--- Current README.md ---
${currentReadme || "(no README exists yet)"}

--- Git diff that triggered this update ---
${diffText}

Return the complete updated README.md.`;

  return callClaude(system, user);
}

module.exports = { classifyChange, regenerateReadme };
