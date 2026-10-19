---
name: sql-schema
description: >-
  Maintains SQL schema as a latest master migration plus feature migrations
  and feature seeds. Use when changing database schema, Supabase SQL,
  migrations, or seed data, or when the user mentions a master migration,
  feature-migrations, or a master seed.
---

# SQL schema

When you change a project's SQL schema, keep the master migration, the feature migrations, and the seeds in sync. A new table that exists only in an incremental file is incomplete.

## Layout

Under the project's `supabase/` directory:

```text
supabase/migrations/
  master-migration/
    archive/
    LATEST_YYYYMMDD.sql
  feature-migrations/
    YYYYMMDDHHMMSS_platform_<name>.sql
    YYYYMMDDHHMMSS_app_<name>.sql
  seed/features/
    <feature>.sql
    <feature>_down.sql
  YYYYMMDDHHMMSS_*.sql   # symlinks into feature-migrations, for the CLI
```

## Master migration

`supabase/migrations/master-migration/LATEST_YYYYMMDD.sql` must create the whole schema at its latest point on an empty database.

When the schema changes:

1. Move the current `LATEST_*.sql` into `supabase/migrations/master-migration/archive/`. Do not delete it.
2. Write a new `LATEST_YYYYMMDD.sql` (today's date) that includes the change. Rebuild it as the ordered contents of every file in `feature-migrations/`, or as an equivalent full schema that creates the same database.
3. Do not give the master file a timestamp prefix. The CLI applies only timestamped files that sit directly in `supabase/migrations/`.

## Feature migrations

Incremental history lives in `supabase/migrations/feature-migrations/`. One file may cover more than one table. Name it for the feature it ships.

The Supabase CLI only reads timestamped SQL files directly inside `supabase/migrations/`. Those entries are symlinks to `feature-migrations/<file>.sql`. `npm run supabase:push` refreshes the links before it runs.

Keep the `platform_` / `app_` infix and the timestamp prefix. Do not rename a file that a remote database has already applied.

## Seeds

- One folder: `supabase/migrations/seed/features/`.
- Each feature has an up file and a `_down` file. Ups are safe to run again.
- A seed row whose referenced id is missing is skipped. The rest of that file still applies. A missing table still stops the file.
- Do not give seed files a timestamp prefix. The CLI does not apply subfolders.
- `scripts/supabase-master-seed.mjs` applies every feature up in order, and every down in reverse.
- A feature script (for example `scripts/supabase-seed-tracked-links.mjs`) applies only that feature.
- `npm run supabase:seed` runs the master script.

## Push arming

`npm run supabase:push` refuses to run unless `SUPABASE_PUSH_ENABLED=1` in the supabase env file. Leave it at `0`. That is the arming switch for a remote schema change.

## Check

After a schema change, an empty database can be created from `LATEST_*.sql` alone, and a database that already has history can take only the new feature migration via `npm run supabase:push` after the flag is armed.
