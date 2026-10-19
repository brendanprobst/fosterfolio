# `supabase/` — Database schema and seed data

## Contents

- **`migrations/master-migration/LATEST_YYYYMMDD.sql`** — One script that creates the whole schema on an empty database. The previous file moves to **`migrations/master-migration/archive/`**. `db push` does not apply it.
- **`migrations/feature-migrations/`** — Incremental SQL applied with **`npm run supabase:push`**. Names must use the **`platform_`** or **`app_`** infix. Timestamped files directly in **`migrations/`** are symlinks to these, because the CLI does not read subfolders.
- **`seed/features/`** — Development **data**, one up file and one `_down` file per feature. **`npm run supabase:seed`** runs every feature. **`npm run supabase:seed:tracked-links`** runs one. See [`docs/playbooks/dev-seed-data.md`](../docs/playbooks/dev-seed-data.md).
- **`config.toml`**, **`.env.example`** — Supabase CLI config; credentials go in the gitignored `.env.local`.

## Rules

- **Schema changes only via `migrations/feature-migrations/`**, and rebuild `migrations/master-migration/LATEST_*.sql` in the same change. Never edit the dashboard SQL editor, or `db push` drifts and needs `migration repair`.
- **Never put seed rows in a timestamped migration.** Seeds live in `seed/features/`. The CLI does not apply that subfolder.
- Product tables use plain `text` for open vocabularies (`species`, `status`, `post_type`, `geo_lock`) — validation lives in `apps/api/domain/entities/`, not in CHECK constraints.
- RLS policies are defense in depth: the API uses the service role and bypasses them. Ownership is enforced in use cases.
- `search_vector` columns are generated — never insert or update them.

## Changing the seed

- Keep each **`seed/features/<feature>.sql`** in sync with its **`_down`** file. Teardown matches on ids starting **`f05e`** and emails ending **`@seed.fosterfolio.test`**; new rows must follow both conventions or they will not be removed.
- Skip a seed row when its referenced id is missing. Do not fail the rest of the file. A missing table still fails the file.
- Every insert upserts (`on conflict … do update`) so re-running is safe, and `created_at` values are relative to `now()` so the feed stays fresh.
- Update the counts in the playbook and in the seed file header when you add or remove rows.
