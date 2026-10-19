#!/usr/bin/env node
/**
 * Switch between Claude Code and Cursor agent configurations.
 *
 *   npm run use:claude   — generate CLAUDE.md, .claude/{rules,commands,skills}, .mcp.json; remove .cursor/rules
 *   npm run use:cursor   — generate .cursor/rules/*.mdc (+ README); remove the Claude files above
 *   npm run agents:sync  — generate both (for teams using both tools simultaneously)
 *   npm run agent:status — show which mode is currently active
 *
 * Source of truth:
 *   agents/prompts/<id>.md          — expert personas (both tools)
 *   .cursor/skills/<name>/          — skills, mirrored to .claude/skills/<name>/
 *   .cursor/mcp.json                — MCP servers, converted to .mcp.json
 * Edit there, then re-run the appropriate command to regenerate.
 *
 * Generated files are committed to git — both Cursor and Claude configs can coexist in
 * git history. Switching is always reversible by re-running the generate command.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ─── Agent definitions (mirrors agents/prompts/registry.yaml) ────────────────

const PATH_AGENTS = [
  {
    id: "ddd-expert",
    prompt: "agents/prompts/ddd-expert.md",
    description: "DDD expert — domain & application layers (auto when editing domain/use-case files)",
    globs: ["apps/api/domain/**", "apps/api/application/**", "docs/adr/**"],
  },
  {
    id: "test-expert",
    prompt: "agents/prompts/test-expert.md",
    description: "Test expert — Jest & integration tests (auto when editing tests or feature code under apps/)",
    globs: ["test/api/**", "test/web/**", "test/AGENTS.md", "apps/api/**", "apps/web/client/**", "apps/web/app/**"],
  },
  {
    id: "infra-expert",
    prompt: "agents/prompts/infra-expert.md",
    description: "Infra expert — adapters, composition root, config, seed (auto when editing infra/config)",
    globs: ["apps/api/infrastructure/**", "apps/api/config/**", "apps/web/client/lib/**", "seed.json"],
  },
];

const GLOBAL_AGENTS = [
  {
    id: "debugger-expert",
    prompt: "agents/prompts/debugger-expert.md",
    description: "Debugger expert — attach with @Rules when investigating failures, flakes, or production errors",
    command: "debug",
  },
  {
    id: "code-janitor",
    prompt: "agents/prompts/code-janitor.md",
    description: "Code janitor — attach with @Rules for audits, cleanup PRs, consistency, and hygiene",
    command: "janitor",
  },
  {
    id: "session",
    prompt: "agents/prompts/session.md",
    description:
      "Session close-out — /session or @Rules after a stretch of agent work to re-review files touched, take a brain dump, and commit a session-log stop with a SESSION trailer",
    command: "session",
  },
  {
    id: "session-review",
    prompt: "agents/prompts/session-review.md",
    description:
      "Session review — /session-review or @Rules to re-read every file from a work session across chats and git history, without editing",
    command: "session-review",
  },
  {
    id: "session-fix",
    prompt: "agents/prompts/session-fix.md",
    description: "Session fix — /session-fix or @Rules to apply only the quick fixes from a session review",
    command: "session-fix",
  },
  {
    id: "session-next",
    prompt: "agents/prompts/session-next.md",
    description:
      "Session next — /session-next or @Rules to append the session stop to docs/plans/sessions/log.md and commit it with a SESSION trailer",
    command: "session-next",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readPrompt(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) {
    console.error(`\nError: prompt file not found: ${relPath}`);
    console.error("Remove the agent from PATH_AGENTS/GLOBAL_AGENTS in scripts/use-agent.mjs first, then delete the prompt.\n");
    process.exit(1);
  }
  return readFileSync(abs, "utf8");
}

function writeFile(relPath, content) {
  const abs = join(ROOT, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf8");
  console.log(`  + ${relPath}`);
}

function removePath(relPath) {
  const abs = join(ROOT, relPath);
  if (existsSync(abs)) {
    rmSync(abs, { recursive: true, force: true });
    console.log(`  - ${relPath}`);
  }
}

// Derive target directories for CLAUDE.md from globs (skip file-only entries like seed.json)
function dirsFromGlobs(globs) {
  return globs.filter((g) => g.endsWith("/**")).map((g) => g.slice(0, -3));
}

// Globs a directory CLAUDE.md can't express (single files, wildcards) — emitted as a
// path-scoped .claude/rules/<id>.md instead
function fileGlobs(globs) {
  return globs.filter((g) => !g.endsWith("/**"));
}

// Short display name: "DDD expert — domain & …" → "DDD expert"
function shortName(agent) {
  return agent.description.split(" — ")[0];
}

// ─── Cursor-native sources mirrored into Claude ──────────────────────────────

const CURSOR_SKILLS_DIR = ".cursor/skills";
const CURSOR_MCP = ".cursor/mcp.json";

function skillNames() {
  const abs = join(ROOT, CURSOR_SKILLS_DIR);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(abs, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();
}

// Cursor writes `${env:VAR}` and infers HTTP from `url`; Claude wants `${VAR}` and an explicit type
function claudeMcpContent() {
  const cursor = JSON.parse(readFileSync(join(ROOT, CURSOR_MCP), "utf8"));
  const mcpServers = {};
  for (const [name, server] of Object.entries(cursor.mcpServers ?? {})) {
    mcpServers[name] = server.url && !server.type ? { type: "http", ...server } : server;
  }
  return JSON.stringify({ mcpServers }, null, 2).replace(/\$\{env:(\w+)\}/g, "${$1}") + "\n";
}

// Build .mdc frontmatter from agent metadata
function mdcFrontmatter(agent) {
  const lines = ["---", `description: ${agent.description}`];
  if (agent.globs && agent.globs.length) {
    lines.push("globs:");
    for (const g of agent.globs) lines.push(`  - "${g}"`);
  }
  lines.push("alwaysApply: false", "---", "");
  return lines.join("\n");
}

// ─── All generated file paths (for status checks) ────────────────────────────

function claudePaths() {
  const paths = ["CLAUDE.md"];
  for (const a of PATH_AGENTS) {
    for (const dir of dirsFromGlobs(a.globs)) paths.push(`${dir}/CLAUDE.md`);
    if (fileGlobs(a.globs).length) paths.push(`.claude/rules/${a.id}.md`);
  }
  for (const a of GLOBAL_AGENTS) paths.push(`.claude/commands/${a.command}.md`);
  for (const name of skillNames()) paths.push(`.claude/skills/${name}`);
  if (existsSync(join(ROOT, CURSOR_MCP))) paths.push(".mcp.json");
  return paths;
}

function cursorPaths() {
  return [...[...PATH_AGENTS, ...GLOBAL_AGENTS].map((a) => `.cursor/rules/${a.id}.mdc`), ".cursor/rules/README.md"];
}

// ─── Root CLAUDE.md ──────────────────────────────────────────────────────────

function fileScopedSection() {
  const rows = PATH_AGENTS.filter((a) => fileGlobs(a.globs).length).map(
    (a) => `| ${fileGlobs(a.globs).map((g) => `\`${g}\``).join(", ")} | ${shortName(a)} (\`.claude/rules/${a.id}.md\`) |`,
  );
  if (!rows.length) return "";
  return `
Single-file globs load from \`.claude/rules/\` when Claude reads a matching file:

| Files | Expert loaded |
|-------|---------------|
${rows.join("\n")}
`;
}

function mirroredSection() {
  const skills = skillNames();
  const hasMcp = existsSync(join(ROOT, CURSOR_MCP));
  if (!skills.length && !hasMcp) return "";
  const lines = ["", "## Skills and MCP", ""];
  if (skills.length) {
    lines.push(
      `Project skills (${skills.map((s) => `\`${s}\``).join(", ")}) are mirrored from \`.cursor/skills/\` into \`.claude/skills/\`.`,
    );
  }
  if (hasMcp) lines.push("MCP servers in `.mcp.json` are converted from `.cursor/mcp.json`.");
  lines.push("Edit the `.cursor/` sources, not the Claude copies — they are overwritten on every sync.", "");
  return lines.join("\n");
}

function rootClaudeContent() {
  return `# Claude agent mode

> Full project context: see \`AGENTS.md\` (monorepo layout, CI, conventions).

## Expert context (auto-loaded by directory)

Claude Code reads the \`CLAUDE.md\` closest to the file you're editing, loading expert
guidance automatically as you navigate the project:

| Directory | Expert loaded |
|-----------|---------------|
| \`apps/api/domain/\`, \`apps/api/application/\`, \`docs/adr/\` | DDD expert |
| \`apps/api/\`, \`apps/web/client/\`, \`apps/web/app/\`, \`test/api/\`, \`test/web/\` | Test expert (tests-first) |
| \`apps/api/infrastructure/\`, \`apps/api/config/\`, \`apps/web/client/lib/\` | Infrastructure expert |
${fileScopedSection()}
## Slash commands (global experts)

Type \`/\` in Claude Code to attach a global expert:

| Command | Use when |
|---------|----------|
| \`/debug\` | Investigating failures, flakes, or non-obvious errors |
| \`/janitor\` | Consistency audits, dead code, dependency hygiene |
| \`/session\` | Close out a stretch of work: re-review, brain dump, then a SESSION stop commit |
| \`/session-review\` | Re-read the work session without editing |
| \`/session-fix\` | Apply only the quick fixes from a session review |
| \`/session-next\` | Append the session stop to the log and commit it with a SESSION trailer |
${mirroredSection()}
---
_Managed by \`npm run use:claude\` / \`npm run agents:sync\`._
_Edit expert content in \`agents/prompts/*.md\`, then re-run to sync._
`;
}

// ─── Generate Claude artifacts ────────────────────────────────────────────────

function generateClaude() {
  writeFile("CLAUDE.md", rootClaudeContent());
  for (const agent of PATH_AGENTS) {
    const body = readPrompt(agent.prompt);
    for (const dir of dirsFromGlobs(agent.globs)) writeFile(`${dir}/CLAUDE.md`, body);
    const files = fileGlobs(agent.globs);
    if (files.length) {
      const frontmatter = ["---", "paths:", ...files.map((g) => `  - "${g}"`), "---", ""].join("\n");
      writeFile(`.claude/rules/${agent.id}.md`, frontmatter + body);
    }
  }
  for (const agent of GLOBAL_AGENTS) {
    writeFile(`.claude/commands/${agent.command}.md`, readPrompt(agent.prompt));
  }
  for (const name of skillNames()) {
    const dest = `.claude/skills/${name}`;
    rmSync(join(ROOT, dest), { recursive: true, force: true });
    cpSync(join(ROOT, CURSOR_SKILLS_DIR, name), join(ROOT, dest), { recursive: true });
    console.log(`  + ${dest}/`);
  }
  if (existsSync(join(ROOT, CURSOR_MCP))) writeFile(".mcp.json", claudeMcpContent());
}

// ─── Generate Cursor artifacts ────────────────────────────────────────────────

function generateCursor() {
  for (const agent of [...PATH_AGENTS, ...GLOBAL_AGENTS]) {
    const body = readPrompt(agent.prompt);
    writeFile(`.cursor/rules/${agent.id}.mdc`, mdcFrontmatter(agent) + body);
  }
  writeFile(".cursor/rules/README.md", cursorReadmeContent());
}

function cursorReadmeContent() {
  const code = (s) => `\`${s}\``;
  const rows = [
    ...PATH_AGENTS.map(
      (a) => `| ${code(`${a.id}.mdc`)} | ${shortName(a)} | Automatically when you work on ${a.globs.map(code).join(", ")}. |`,
    ),
    ...GLOBAL_AGENTS.map(
      (a) => `| ${code(`${a.id}.mdc`)} | ${shortName(a)} | **Not** path-scoped — attach with **\`@\` → Rules**. |`,
    ),
  ];
  return `# Cursor project rules

These \`.mdc\` files define **expert personas** for this repo.

| Rule file | Expert | When it applies |
|-----------|--------|------------------|
${rows.join("\n")}

## Attaching global experts (\`@\`)

In **Chat** or **Composer**, type **\`@\`** → **Rules** (wording may be **Cursor Rules** in your build) → select the expert.

Fallback: **\`@\`** → **Files** → the matching file under \`.cursor/rules/\`.

Scoped rules still apply from file paths; \`@\` adds the global expert when you need it (e.g. debugging outside \`test/api/\`, or a janitor pass on the whole tree).

---
_Generated by \`npm run use:cursor\` / \`npm run agents:sync\` from \`agents/prompts/\` — edit there, then re-run._
`;
}

// ─── Remove Claude artifacts ──────────────────────────────────────────────────

function removeClaude() {
  for (const p of claudePaths()) removePath(p);
}

// ─── Remove Cursor artifacts ──────────────────────────────────────────────────

function removeCursor() {
  for (const p of cursorPaths()) removePath(p);
}

// ─── Commands ─────────────────────────────────────────────────────────────────

function useClaude() {
  console.log("Switching to Claude agent mode…\n");
  generateClaude();
  console.log();
  removeCursor();
  console.log(`
Claude agent mode active.

Stage and commit to record in git history:
  git add -A
  git commit -m "chore: activate Claude agent mode"

Edit expert content in agents/prompts/*.md, then re-run npm run use:claude to sync.
Switch back: npm run use:cursor
`);
}

function useCursor() {
  console.log("Switching to Cursor agent mode…\n");
  generateCursor();
  console.log();
  removeClaude();
  console.log(`
Cursor agent mode active.

Stage and commit to record in git history:
  git add -A
  git commit -m "chore: activate Cursor agent mode"

Edit expert content in agents/prompts/*.md, then re-run npm run use:cursor to sync.
Switch back: npm run use:claude
`);
}

function sync() {
  console.log("Syncing all agent configs…\n");
  generateClaude();
  console.log();
  generateCursor();
  console.log(`
Both Claude and Cursor configs are up to date.

Stage and commit to record in git history:
  git add -A
  git commit -m "chore: sync agent configs"
`);
}

function status() {
  const claudeActive = existsSync(join(ROOT, "CLAUDE.md"));
  const cursorActive = existsSync(join(ROOT, ".cursor/rules/ddd-expert.mdc"));

  if (claudeActive && cursorActive) {
    console.log("Agent mode: synced (both Claude and Cursor configs present)");
  } else if (claudeActive) {
    console.log("Agent mode: claude");
  } else if (cursorActive) {
    console.log("Agent mode: cursor");
  } else {
    console.log("Agent mode: none — run npm run use:claude or npm run use:cursor");
    return;
  }

  if (claudeActive) {
    const missing = claudePaths().filter((p) => !existsSync(join(ROOT, p)));
    if (missing.length) console.log(`  Claude: ${missing.length} file(s) missing — re-run npm run use:claude`);
  }
  if (cursorActive) {
    const missing = cursorPaths().filter((p) => !existsSync(join(ROOT, p)));
    if (missing.length) console.log(`  Cursor: ${missing.length} file(s) missing — re-run npm run use:cursor`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const cmd = process.argv[2];
if (cmd === "claude") useClaude();
else if (cmd === "cursor") useCursor();
else if (cmd === "sync") sync();
else if (cmd === "status") status();
else {
  console.error("Usage: npm run use:claude | npm run use:cursor | npm run agents:sync | npm run agent:status");
  process.exit(1);
}
