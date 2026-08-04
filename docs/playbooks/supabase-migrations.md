# Supabase migrations (CLI) — `supabase-cli-migrations`

Run database schema changes from the terminal and keep **one Supabase project per spawn repo** (smoke-test, runout, each new app). The API uses Supabase via PostgREST with the **service role**; this playbook is only for **DDL/migrations**, not runtime auth.

**Status: wired.** Canonical layout is root `supabase/` with timestamped migrations and `npm run supabase:*` scripts. The allowlist SQL that used to live at `apps/api/supabase/migrations/` now lives under `supabase/migrations/` with a `platform_` infix (see [Migration naming](#migration-naming)).

---

## One project per repository

| Repo | Typical Supabase project |
|------|---------------------------|
| `lattice-app-smoke-test` | Canary / deploy smoke project |
| Product child app (e.g. runout) | That app’s project |
| New app after `npm run scaffold` | New project you create at first deploy |

Linking is **per git clone**, not global. `NEXT_PUBLIC_SUPABASE_URL` in env does **not** replace `supabase link` — the CLI needs an explicit link or database URL to apply migrations.

---

## Layout

```text
supabase/
  config.toml
  .env.example          # tracked — copy to .env.local
  .env.local            # gitignored — project ref, PAT, DB URL
  migrations/
    YYYYMMDDHHMMSS_platform_<name>.sql
    YYYYMMDDHHMMSS_app_<name>.sql
scripts/supabase-cli.mjs
```

---

## Prerequisites

- Node **22** (repo `engines`) and `npm ci` so `node_modules/.bin/supabase` exists
- A hosted Supabase project for **this** repo
- **Project ref** from the dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`
- Personal access token: [Account → Access Tokens](https://supabase.com/dashboard/account/tokens)

---

## First-time setup (per repo)

1. Copy credentials:

```bash
cp supabase/.env.example supabase/.env.local
# fill SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, SUPABASE_DB_URL
```

2. Prefer the **Session pooler** connection string from the dashboard **Connect** dialog (port **5432**, username `postgres.<project-ref>`). Free-tier **direct** hosts (`db.<ref>.supabase.co`) are often IPv6-only and fail with `ENOTFOUND` on IPv4-only networks. Do **not** use the transaction pooler (port **6543**) for DDL.

```bash
# Session pooler (recommended default for local DDL)
postgresql://postgres.<project-ref>:<password>@aws-<N>-<region>.pooler.supabase.com:5432/postgres
```

After `npm run supabase:link`, the CLI also writes `supabase/.temp/pooler-url` (gitignored) with the host/user for this project — useful if you guessed the region wrong.

3. Link / verify / push:

```bash
npm run supabase:handshake   # link + migration list; redacts secrets from output
npm run supabase:push:dry
npm run supabase:push
npm run supabase:list
```

After rotating the DB password, update `SUPABASE_DB_URL` in `supabase/.env.local` and re-run `npm run supabase:handshake`. Do not pass the password on the command line.

`scripts/supabase-cli.mjs` loads `supabase/.env.local`, resolves the local CLI binary, and forwards `SUPABASE_DB_URL` as `--db-url` for database commands. For `link`, it derives `--password` from that URL when you omit it.

Do **not** commit database passwords or `supabase/.temp/`.

---

## Migration naming

The CLI requires a **flat** `supabase/migrations/` directory. Filenames must use a timestamp prefix plus one of these infixes so [upstream harvest](upstream-harvest.md) can separate reusable platform SQL from product schema:

| Infix | Meaning | Harvest |
|-------|---------|---------|
| `platform_` | Generic Lattice infrastructure (allowlist, shared helpers) | Candidate for template |
| `app_` | Product schema for this spawn (pets, posts, …) | Stays in the child app |

```bash
npm run supabase:new -- platform_add_widget_table
npm run supabase:new -- app_add_pets_table
```

The wrapper rejects names that omit the infix.

---

## Day-to-day

```bash
npm run supabase:new -- app_<name>   # create empty timestamped file
# edit the SQL, then:
npm run supabase:push:dry
npm run supabase:push
npm run supabase:list                # local vs remote history
```

The remote tracks applied files in `supabase_migrations.schema_migrations`. Re-running `push` skips migrations already applied.

**Rule:** Make schema changes **only** through migration files — not ad-hoc in the dashboard SQL editor — or `db push` will drift and require [`migration repair`](https://supabase.com/docs/reference/cli/supabase-migration-repair).

---

## MCP (read-only)

`.cursor/mcp.json` registers the Supabase MCP server scoped to this project (`read_only=true`). It reads:

- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`

from the **Cursor / shell environment** (not from `supabase/.env.local`). Export both in your shell profile, or add them to Cursor’s env settings, then reload MCP.

---

## Per-repo workflow after template refresh

When you [refresh a spawn](../scaffold-workflow.md#refresh-an-existing-spawn-re-sync-from-template) and new `platform_` migrations appear:

1. Read what changed.
2. `npm run supabase:push` against **that repo’s** project.
3. Run app-level flags if the migration docs say so (e.g. allowlist: `set_allowlist_enabled(true)` + API env).

Do **not** run smoke-test migrations against another spawn’s project.

---

## Existing database already changed by hand

1. `npm run supabase:list` — compare local files vs remote history.
2. `supabase db pull` — optional: capture remote schema into a new migration file.
3. `supabase migration repair` — if the CLI reports history mismatch.

Prefer fixing history once, then only use migration files going forward.

---

## CI (optional, later)

```yaml
- uses: supabase/setup-cli@v1
- run: npm run supabase:push
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
    SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
    SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
```

Gate on `main` or a deploy workflow — not required for local dev.

---

## Related

- [Email allowlist](email-allowlist.md) — first `platform_` migration; needs privileges that the session pooler or direct Postgres role can grant on `auth.users`
- [Smoke test deployment guide](../plans/smoke_test_deployment_guide.plan.md) — Supabase project + env before AWS deploy
- [Scaffold workflow](../scaffold-workflow.md) — greenfield spawn and refresh checklist
- [Upstream harvest](upstream-harvest.md) — how `platform_` migrations flow back into the template
- [Supabase CLI reference](https://supabase.com/docs/reference/cli/introduction)
