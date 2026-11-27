# Plan: handle aliases, handle change cooldown, and 5xx alarm

Status: **Parts A and B implemented on 2026-11-26, not yet deployed.** Part C was already in the repo.
Not yet done: apply the migration (`npm run supabase:push`, needs the push flag armed), then deploy. The SQL has not been run against a real Postgres.

Implementation notes (differences from the plan):
- Part C was already merged (`serverErrorLog.ts`, metric filter, alarms). Left alone. Its thresholds are dev 100 and prod 1, not the 3 written below.
- Added `oldestHandleChangeSince(userId, since)` to `IUserRepository`. `countHandleChangesSince` alone can't give `nextChangeAt`.
- The alias-ownership check applies to every handle set, including a first handle, so nobody can claim another user's alias. The cooldown and alias recording apply only when an existing handle is replaced or cleared.
- The change row is written after the user save, so a failed save (for example a unique-index race) doesn't spend a change.
- The rename/clear confirm text no longer says "will stop working", since the old URL now redirects.
- Not done: a "changes remaining" counter. It needs a new owner DTO field. The form shows the static limit text, and the `nextChangeAt` date once the limit is hit.
- Redirect covers the profile and foster-me pages. Pet permalink pages (`/@old/pet/:id`) resolve the owner through the API but don't redirect.
- e2e seed gained a second user (`casey-now`, alias `casey-before`). Five inquiry e2e tests fail on a clean checkout too.
Owner: Brendan
Related: `docs/plans/vanity_urls.plan.md`, `docs/plans/v2_slice5b_foster_me_links.plan.md`

## Background

- A user changed her handle from `elisa-probst` to `elisa`. Her printed/shared QR codes point at `/@elisa-probst/foster-me`. Two problems:
  1. **Broken link (product):** the old handle no longer resolves anywhere.
  2. **Silent failure (monitoring):** the lookup returned a generic 500. Use cases swallowed the exception, and the API alarm only counts Lambda-level crashes, so nothing alerted.
- Already fixed on this branch (not yet deployed):
  - `UserRepository.findById` returns `null` for non-UUID ids instead of querying the uuid column. This is why a missing handle became a 500.
  - All 32 use-case catch blocks that return `INTERNAL_SERVER_ERROR` log through `logUnexpectedError` (`apps/api/utils/logUnexpectedError.ts`).
  - Duplicate error message on the foster-me page is fixed.
  - One-time handle-change tip is implemented in the web profile form (`apps/web/client/lib/handleChangeTip.ts`, `ProfileEditForm.tsx`).

## Decisions (final)

1. **Cooldown error status: 409.** New error code `HANDLE_CHANGE_LIMIT`, status 409, returned with `nextChangeAt`.
2. **Aliases are reserved forever** for the original owner. Nobody else can claim an alias.
3. **No alias is recorded for `elisa-probst`.** Her old handle is not backfilled.
4. **QR codes keep using the handle.** No UUID-based QR URL. Stable id-based URLs are out of scope.
5. **Warning text as written** (the stopgap text in the profile field and the tip in the form).

## Verified facts (checked against the code)

- `UpdateUserUseCase` handle path: it parses the handle, calls `userRepository.isHandleTaken(value, user.id)`, returns `HANDLE_TAKEN` (409), then calls `user.applyProfileUpdate({ handle })`. The DB unique violation is mapped by `isHandleUniqueViolation`. **Alias and cooldown checks go in this path, before the save.**
- `UserErrors.HANDLE_TAKEN` exists with status 409. `HANDLE_CHANGE_LIMIT` will be added next to it in `apps/api/domain/errors/catalogs/UserErrors.ts`.
- `resolveUser` (`apps/api/application/resolveUser.ts`) tries handle, then `findById` (now safe for non-UUIDs). Alias fallback goes between these two steps.
- Migrations: feature migrations live in `supabase/migrations/feature-migrations/`, and the master is `supabase/migrations/master-migration/LATEST_20261018.sql`. Per the `sql-schema` skill, each schema change updates both.
- Lambda log groups exist and are named `/aws/lambda/fosterfolio-{dev,prod}-api`. Terraform does not manage them, so the metric filter references them by name.
- Prod alarms: `fosterfolio-prod-api-errors` (Lambda `Errors`, threshold 3 in 5 min) and the SNS topic `fosterfolio-prod-alarms` with a confirmed email subscription.
- The foster-me page is a static export. CloudFront serves one sentinel HTML for every `/@handle/...` path, so alias redirects happen in the browser, not with an HTTP 301.

## Part A: handle aliases

### Data model
- New table `user_handle_aliases`:
  - `handle text primary key` (lowercase, same rules as `UserHandle`)
  - `user_id uuid not null references users(id) on delete cascade`
  - `created_at timestamptz not null default now()`
- No public read. Lookups go through the API with the service role, same as `users`.
- Feature migration: `supabase/migrations/feature-migrations/<timestamp>_app_v2_handle_aliases.sql`. Also update `master-migration/LATEST_*.sql` per `sql-schema`.
- No backfill (decision 3).

### Repository interface and in-memory implementation

`IUserRepository` (`apps/api/domain/repositories/IUserRepository.ts`) gets four new methods:

| Method | Used by | Postgres (`UserRepository`) | In-memory (`InMemoryUserRepository`) |
|---|---|---|---|
| `findAliasOwner(handle): Promise<string \| null>` | handle change, `resolveUser` fallback | select `user_id` from `user_handle_aliases` | `Map<handle, userId>` |
| `recordAlias(handle, userId): Promise<void>` | handle change | insert, `on conflict do nothing` | set in the map |
| `countHandleChangesSince(userId, since: Date): Promise<number>` | cooldown | count rows in `user_handle_changes` | filter an array of `{ userId, changedAt }` |
| `recordHandleChange(userId, at: Date): Promise<void>` | cooldown | insert row | push to the array |

- The in-memory class needs a matching `Map` / array field each, next to the existing `users` and `starCounts` maps, so unit and e2e runs don't need Postgres.
- `findAliasOwner` returns an id, not a `User`. `resolveUser` then calls `findById` on that id, so the alias fallback only needs the id.
- `isHandleTaken` stays as it is. It covers current and soft-deleted handles. The alias check is a separate call in the use case, so the existing semantics don't change.
- The in-memory repo is used by `e2eSeed.ts` and the composition files (`composition/users.ts`, `search.ts`, `stars.ts`). Check that the e2e wiring still builds after the interface change.
- Tests for the in-memory implementation: add a small test that `recordAlias` then `findAliasOwner` round-trips, and that `countHandleChangesSince` respects the `since` date. Run the same cases against Postgres in the existing integration setup if one exists.

### Domain / use cases (test first)
- In `UpdateUserUseCase`, on a handle change where the user already had a handle:
  1. Check the cooldown (Part B). Reject with `HANDLE_CHANGE_LIMIT` if exceeded.
  2. Reject with `HANDLE_TAKEN` if the new handle is an alias owned by a different user (`findAliasOwner`).
  3. Save the old handle as an alias (`recordAlias`), then save the new handle.
- Clearing the handle (set to null) also records the old handle as an alias and counts as a change.
- Tests (red first), `test/api/`:
  - Changing a handle records the old one as an alias.
  - An alias owned by another user blocks the new handle with 409 `HANDLE_TAKEN`.
  - Setting a first handle (old handle null) records no alias and does not count toward the cooldown.
  - `resolveUser` falls back to an alias and returns the current user.

### API
- `GET /users/:handle` for an alias returns the user and a new optional `canonicalHandle` on `UserPublicDto` and `UserOwnerDto`.

### Web (test first)
- When `canonicalHandle` differs from the URL handle, `router.replace` to the same sub-path under the canonical handle (for example `/@elisa/foster-me`). Unit test in `test/web/unit/`.
- Playwright e2e in `test/web/e2e/`: visit an alias URL, expect the canonical URL.

## Part B: cooldown (2 changes per rolling 30 days)

- Source of truth: `user_handle_changes (user_id uuid, changed_at timestamptz)`, one row per change. Same feature migration as Part A.
- Rule (in the use case): count changes in the last 30 days. If count >= 2, return `HANDLE_CHANGE_LIMIT` (409) with `nextChangeAt` = oldest change in window + 30 days.
- First-time set does not count.
- Tests (red first):
  - 0 changes in window → allowed.
  - 2 changes in window → rejected with `nextChangeAt`.
  - 2 changes, oldest outside window → allowed.
- Web: the profile field shows "You can change your handle 2 times every 30 days" and the warning text (decision 5). The one-time tip after the first change is already implemented (see Background). Note: the tip shows on the first change, and the cooldown counter shows remaining changes. Once the limit is reached, the form shows the `nextChangeAt` date.

## Part C: CloudWatch alarm fix (monitoring)

Goal: alert when the API returns 5xx responses, including handled ones that never crash Lambda.

1. **One searchable log line per 5xx.** Log `API_5XX status=<code> code=<error.code>` when a response is 500 or higher. Put it in `ResponseHandler.handleResult` (used by controllers for domain failures) and in the `handleError` path. Tests: a 500 emits the line, a 404 does not.
2. **Metric filter** on `/aws/lambda/fosterfolio-prod-api` (and dev). Filter pattern `"API_5XX"`, namespace `Fosterfolio/API`, metric `Api5xxCount`, value 1. Terraform in `infra/terraform/envs/{dev,prod}/alarms.tf` using `aws_cloudwatch_log_metric_filter` with the log group name as a string.
3. **Alarm** `fosterfolio-{env}-api-5xx`: Sum of `Api5xxCount`, period 300 s, 1 evaluation period, threshold >= 3 (matches the existing API alarm), `treat_missing_data = notBreaching`, action = existing `alarms` SNS topic.
4. Keep the existing `api-errors` alarm.

Apply to dev first. Trigger a 500 in dev, confirm the email arrives, then apply to prod.

## Deploy order

1. Merge the current branch (logging, `findById` fix, duplicate-error fix, handle-change tip) and deploy the prod API. The logging is live after this, so the next failure is visible even before the alarm.
2. Part C to dev, then prod.
3. Part B (cooldown) with its UI. Ships before aliases, so the warning is accurate once aliases exist.
4. Part A (aliases) and the web redirect.

## Out of scope

- UUID-based QR URLs (decision 4).
- Releasing aliases after a period (decision 2).
- Moderation of handle squatting beyond the cooldown and reservation.
- Changing the static export architecture.
