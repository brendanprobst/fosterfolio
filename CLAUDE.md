# Claude agent mode

> Full project context: see `AGENTS.md` (monorepo layout, CI, conventions).

## Expert context (auto-loaded by directory)

Claude Code reads the `CLAUDE.md` closest to the file you're editing, loading expert
guidance automatically as you navigate the project:

| Directory | Expert loaded |
|-----------|---------------|
| `apps/api/domain/`, `apps/api/application/`, `docs/adr/` | DDD expert |
| `apps/api/`, `apps/web/client/`, `apps/web/app/`, `test/api/`, `test/web/` | Test expert (tests-first) |
| `apps/api/infrastructure/`, `apps/api/config/`, `apps/web/client/lib/` | Infrastructure expert |

Single-file globs load from `.claude/rules/` when Claude reads a matching file:

| Files | Expert loaded |
|-------|---------------|
| `test/AGENTS.md` | Test expert (`.claude/rules/test-expert.md`) |
| `seed.json` | Infra expert (`.claude/rules/infra-expert.md`) |

## Slash commands (global experts)

Type `/` in Claude Code to attach a global expert:

| Command | Use when |
|---------|----------|
| `/debug` | Investigating failures, flakes, or non-obvious errors |
| `/janitor` | Consistency audits, dead code, dependency hygiene |
| `/session` | Close out a stretch of work: re-review, brain dump, then a SESSION stop commit |
| `/session-review` | Re-read the work session without editing |
| `/session-fix` | Apply only the quick fixes from a session review |
| `/session-next` | Append the session stop to the log and commit it with a SESSION trailer |

## Skills and MCP

Project skills (`explain-diff`, `sql-schema`, `stage-chunk`) are mirrored from `.cursor/skills/` into `.claude/skills/`.
MCP servers in `.mcp.json` are converted from `.cursor/mcp.json`.
Edit the `.cursor/` sources, not the Claude copies — they are overwritten on every sync.

---
_Managed by `npm run use:claude` / `npm run agents:sync`._
_Edit expert content in `agents/prompts/*.md`, then re-run to sync._
