# `supabase/` — Database schema and seed data

## Contents

- **`migrations/`** — Flat, timestamped SQL applied with **`npm run supabase:push`**. Names must use the **`platform_`** (reusable Lattice infrastructure) or **`app_`** (product schema) infix; `npm run supabase:new -- app_<name>` enforces it. See [`docs/playbooks/supabase-migrations.md`](../docs/playbooks/supabase-migrations.md).
- **`seed/`** — Development **data**, applied with **`npm run supabase:seed`**. See [`docs/playbooks/dev-seed-data.md`](../docs/playbooks/dev-seed-data.md).
- **`config.toml`**, **`.env.example`** — Supabase CLI config; credentials go in the gitignored `.env.local`.

## Rules

- **Schema changes only via `migrations/`** — never ad hoc in the dashboard SQL editor, or `db push` drifts and needs `migration repair`.
- **Never put seed rows in `migrations/`.** Migrations run against production; `seed/` is deliberately outside that path so `db push` cannot apply it.
- Product tables use plain `text` for open vocabularies (`species`, `status`, `post_type`, `geo_lock`) — validation lives in `apps/api/domain/entities/`, not in CHECK constraints.
- RLS policies are defense in depth: the API uses the service role and bypasses them. Ownership is enforced in use cases.
- `search_vector` columns are generated — never insert or update them.

## Changing the seed

- Keep **`seed/dev_seed.sql`** and **`seed/dev_seed_down.sql`** in sync. Teardown matches on ids starting **`f05e`** and emails ending **`@seed.fosterfolio.test`**; new rows must follow both conventions or they will not be removed.
- Every insert upserts (`on conflict … do update`) so re-running is safe, and `created_at` values are relative to `now()` so the feed stays fresh.
- Update the counts in the playbook and in the seed file header when you add or remove rows.
