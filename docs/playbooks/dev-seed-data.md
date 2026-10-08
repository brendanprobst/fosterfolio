# Development seed data — `dev-seed-data`

Fill a Supabase project with realistic Fosterfolio content — fosters you can sign in as, pets across every species and status, and a feed long enough to page through.

**Status: wired.** SQL lives in `supabase/migrations/seed/features/`. `npm run supabase:seed` applies every feature. `npm run supabase:seed:tracked-links` applies one.

```bash
npm run supabase:seed              # apply
npm run supabase:seed -- --dry-run # show what would run, send nothing
npm run supabase:seed:down -- --yes  # remove every seeded row
```

Sign in as any seeded foster:

| Email | Password |
|---|---|
| `alex.foster@seed.fosterfolio.test` | `Fosterfolio-Seed-2026!` |
| `bianca.nguyen@seed.fosterfolio.test` | same |
| `carlos.rivera@seed.fosterfolio.test` | same |
| `dana.whitfield@seed.fosterfolio.test` | same |

Override the password for a run with `npm run supabase:seed -- --password 'something-else'` or `SEED_PASSWORD=… npm run supabase:seed`.

---

## Not a migration

Seeds deliberately sit **outside** `supabase/migrations/feature-migrations/` so `npm run supabase:push` can never apply them to a production project. Nothing tracks them in `supabase_migrations.schema_migrations`; re-run them whenever you want.

| File | Purpose |
|---|---|
| `supabase/migrations/seed/features/core.sql` | Fosters, pets, posts, stars, inquiries |
| `supabase/migrations/seed/features/core_down.sql` | Delete exactly what the core seed created |
| `supabase/migrations/seed/features/tracked-links.sql` | Sample links for Mochi |
| `supabase/migrations/seed/features/tracked-links_down.sql` | Delete those links |
| `scripts/supabase-master-seed.mjs` | Applies every feature up, or every down in reverse |

Prerequisite: the schema migrations are already applied (`npm run supabase:push`). The core seed aborts with a clear message if `public.users` or `public.posts` is missing.

A row that points at a missing seed id is skipped, and the rest of that file still applies. The summary counts at the end of the file are the rows that landed. A changed row with the same id is updated. A missing table still stops the file.

---

## What gets seeded

**6 fosters, 12 pets, 27 posts, 8 profile stars, 4 inquiries** — chosen for the cases that are slow to click together by hand:

| Case | Where |
|---|---|
| Feed pagination with a real `nextCursor` | 26 visible posts vs. the default limit of 20 |
| Keyset tie-break on `id` | Two posts share an identical `created_at` |
| Soft-delete filtering | One user, one pet, and one post carry `deleted_at` |
| Empty states | Dana has no pets and no posts; Mia has a null `display_name` |
| Minimal records | "Kitten litter #4" has only the required columns |
| Every vocabulary value | All `PET_SPECIES` and `PET_STATUSES`, plus `sub_status`, both age units, all sizes |
| Rendering edge cases | Markdown bio, long post body, emoji, `Señor Whiskers` (URL encoding), image-only post, `geo_lock = 'global'` |
| Non-empty counts | Star counts of 5 / 2 / 1, inquiries with and without `target_pet_id` |
| Rich profile fields | `social_links`, `important_links`, shelter links, avatars, geo (SF / Oakland / Austin / Brooklyn) |

Photos point at `picsum.photos` seeded URLs, so images are stable across runs without uploading anything to storage. `next.config.ts` sets `images.unoptimized`, so no remote-pattern allowlisting is needed.

### Identifying seeded rows

Two conventions make seed rows obvious in the dashboard and trivial to remove:

- every id starts with **`f05e`** ("foster seed")
- every account email ends with **`@seed.fosterfolio.test`**

Both seed files end with a summary `select`, which the runner prints:

```text
  entity                rows
  --------------------  ----
  users (visible)       5
  users (soft-deleted)  1
  pets (visible)        11
  pets (soft-deleted)   1
  posts (visible)       26
  posts (soft-deleted)  1
  profile_stars         8
  inquiries             4
```

---

## Why it writes `auth.users`

`public.users.id` references `auth.users(id)`, so there is no way to seed a profile without an auth account — and creating them is what lets you actually sign in and exercise authenticated writes. The seed inserts into `auth.users` plus `auth.identities` (email provider, password hashed with `pgcrypto`, email pre-confirmed).

Consequences worth knowing:

- **It needs the `postgres` role.** `npm run supabase:seed` uses the Management API (`POST /v1/projects/{ref}/database/query`), which runs as `postgres`. Under a weaker role the seed fails with an explicit hint instead of a confusing FK error.
- **The allowlist gate runs first.** `enforce_allowed_email` is a `BEFORE INSERT` trigger on `auth.users`, so the seed adds its emails to `public.allowed_emails` before creating accounts. That keeps it working with private beta on; see [`email-allowlist.md`](email-allowlist.md). Teardown removes those rows again.
- **Sign-in is a normal password grant.** Nothing bypasses auth, so the API's JWT middleware and ownership checks behave exactly as in production.

---

## Credentials

`scripts/supabase-seed.mjs` reads `supabase/.env.local` (gitignored), the same file as the migration wrapper:

| Variable | Used for |
|---|---|
| `SUPABASE_PROJECT_REF` | Management API path — the project that gets seeded |
| `SUPABASE_ACCESS_TOKEN` | Bearer token; a fine-grained token needs **`database_write`** |

The runner prints the target project ref before it does anything. `--dry-run` shows the statement count and byte size without sending a request.

No token, or the API is blocked? Paste `supabase/migrations/seed/features/core.sql` into the dashboard SQL editor and run it as one batch — Postgres wraps a multi-statement batch in a single implicit transaction, so a failure rolls the whole thing back.

---

## Which project am I seeding?

`supabase/.env.local` is per clone, so the seed lands in **this** repo's linked project (see [`supabase-migrations.md`](supabase-migrations.md#one-project-per-repository)). Confirm with `npm run supabase:handshake` first if you are unsure. Do not run the seed against a project real users are on: `dev_seed_down.sql` cleans up only rows the seed created, but the accounts are public-readable while they exist.

---

## Relationship to the Playwright seed

Unrelated on purpose. `apps/api/infrastructure/e2eSeed.ts` (`LATTICE_E2E=1`) seeds the **in-memory** repositories with a synthetic JWT user for `npm run test:web:e2e`; it never touches Supabase. The names overlap (Alex Foster, Mochi) because they describe the same fictional foster, but the ids differ — the Playwright user id is not a UUID, while Supabase requires one.

Use the Playwright seed for automated tests, this seed for manual and deployed testing.

---

## Related

- [Supabase migrations](supabase-migrations.md) — apply the schema before seeding
- [Email allowlist](email-allowlist.md) — the signup gate the seed works around
- [Private beta](private-beta.md) — operator SQL for real tester accounts
- [Media upload](media-upload.md) — storage bucket and per-user cap (the seed uses remote photo URLs, not storage)
