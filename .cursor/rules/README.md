# Cursor project rules

These `.mdc` files define **expert personas** for this repo.

| Rule file | When it applies |
|-----------|------------------|
| `ddd-expert.mdc` | Automatically when you work under `apps/api/domain/`, `apps/api/application/`, or `docs/adr/`. |
| `test-expert.mdc` | Automatically when you work under `test/api/`, `test/web/`, or **feature code** under `apps/api/`, `apps/web/client/`, or `apps/web/app/` (tests-first alongside implementation). |
| `infra-expert.mdc` | Automatically when you work under `apps/api/infrastructure/`, `apps/api/config/`, **`apps/web/client/lib/`**, or root `seed.json`. |
| `debugger-expert.mdc` | **Not** path-scoped — attach manually (see below). |
| `code-janitor.mdc` | **Not** path-scoped — attach manually (see below). |
| `session.mdc` | **Not** path-scoped — attach manually. Close-out after a stretch of work. |
| `session-review.mdc` | **Not** path-scoped — attach manually. Re-read the work session; no edits. |
| `session-fix.mdc` | **Not** path-scoped — attach manually. Quick fixes from a session review. |
| `session-next.mdc` | **Not** path-scoped — attach manually. Append the session stop to the log and commit it with a SESSION trailer. |

## Attaching global experts (`@`)

In **Chat** or **Composer**, type **`@`** → **Rules** (wording may be **Cursor Rules** in your build) → select **Debugger expert**, **Code janitor**, or a **Session** rule (`session`, `session-review`, `session-fix`, `session-next`).

Fallback: **`@`** → **Files** → the matching file under `.cursor/rules/`.

Scoped rules still apply from file paths; `@` adds the global expert when you need it (e.g. debugging outside `test/api/`, or a janitor pass on the whole tree).
