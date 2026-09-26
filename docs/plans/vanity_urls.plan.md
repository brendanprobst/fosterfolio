---
name: User handles (vanity URLs)
overview: Add a unique `handle` to users so profiles resolve at `/users/{handle}` as well as `/users/{uuid}` — a full vertical slice from migration to edit dialog. Written from research done on 2026-09-26 so the implementing agent does not have to re-derive the seams.
todos:
  - id: handle-questions
    content: "Settle the four product questions (required or optional, renameable, redirects, reserved list) before any code"
    status: pending
  - id: handle-migration
    content: "Migration: add `public.users.handle` with a unique index and a POSIX format check"
    status: pending
  - id: handle-domain
    content: "Domain: `UserHandle` value object (normalize, validate, reserved list) plus `handle` on `UserProps` / DTOs / `toPersistence`"
    status: pending
  - id: handle-errors
    content: "Errors: `HANDLE_INVALID` (400) and `HANDLE_TAKEN` (409) in `UserErrors` and the `ErrorCatalog` facade"
    status: pending
  - id: handle-repositories
    content: "Repositories: `findByHandle` on `IUserRepository`, the Supabase `UserRepository`, and `InMemoryUserRepository`"
    status: pending
  - id: handle-use-cases
    content: "Use cases: `GetUserUseCase` resolves uuid-or-handle; `UpdateUserUseCase` validates format, reserved words, and uniqueness"
    status: pending
  - id: handle-web
    content: "Web: `handle` on the user DTOs, a handle field in the edit dialog, and handle-first public profile links"
    status: pending
  - id: handle-tests
    content: "Tests: API coverage for lookup/rename/conflict/invalid, plus updated web fixtures"
    status: pending
---

# User handles (vanity URLs)

State as of commit `9cd1da2`. Not started; no code has been written for this. This document exists so the research behind it is not lost.

## Decision

Build the real feature: a unique `handle` column, API lookup by id **or** handle, and a handle field in the profile edit dialog. This was chosen on 2026-09-26 over the cheaper alternative of merely displaying a copyable `/users/{uuid}` on the profile page.

Note that this pulls a **v2 item into the current scope**. The [MVP plan](fosterfolio_mvp.plan.md) lists vanity slugs under what is explicitly *not* in the MVP, and again as a later "sharing that converts" item. Nothing in the codebase contradicts that — a search for `handle`, `username`, `vanity`, and `slug` across the web client, API domain, DTOs, and migrations finds no such field today.

## What already supports this

The MVP plan anticipated it: *"Pet lookup resolves by id-or-slug at the repository seam even though only ids exist in MVP, so v2 vanity slugs touch neither the route nor the edge config."* The same holds for users, and it checks out:

- **Routes** are already opaque. `apps/api/routes/users.ts` mounts `GET /:id`, `PUT /:id`, `/:id/pets`, `/:id/posts`, `/:id/star-count`, and `POST /:id/star`. The param is just a string, so no route changes are needed for `GET /:id`.
- **The edge is already wildcard.** `USER_PROFILE_SENTINEL_ID` (`apps/web/client/lib/constants/userProfileSentinel.ts`) is the nil UUID shared with pets, and the CloudFront viewer-request function rewrites `/users/{anything}` to that sentinel object while the browser URL is preserved. Handle URLs need **no Terraform or CloudFront change**.
- **`userIdFromPathname`** (`apps/web/client/lib/userProfilePath.ts`) already returns whatever segment it finds, rejecting only the sentinel. It needs no change to pass a handle through to the API.

## The slice, layer by layer

| Layer | File | Change |
|---|---|---|
| Schema | new `supabase/migrations/<ts>_app_user_handles.sql` | `handle text`, unique index, format check |
| Domain value | new `apps/api/domain/value-objects/UserHandle.ts` | normalize, validate, reserved list (`value-objects/` already exists) |
| Entity | `apps/api/domain/entities/User.ts` | `handle` on `UserProps`, `UserPublicDto`, `applyProfileUpdate`, `toPublicDto`, `toPersistence` |
| Errors | `apps/api/domain/errors/catalogs/UserErrors.ts`, `ErrorCatalog.ts` | `HANDLE_INVALID` 400, `HANDLE_TAKEN` 409 |
| Port | `apps/api/domain/repositories/IUserRepository.ts` | add `findByHandle` beside `findById` / `save` / `countStars` |
| Supabase adapter | `apps/api/infrastructure/repositories/UserRepository.ts` | add `handle` to `USER_SELECT` and `UserRecord`; implement `findByHandle` |
| In-memory adapter | `apps/api/infrastructure/repositories/InMemoryUserRepository.ts` | implement `findByHandle` over the `Map` |
| Read | `apps/api/application/use-cases/GetUserUseCase.ts` | UUID → `findById`, otherwise → `findByHandle` |
| Write | `apps/api/application/use-cases/UpdateUserUseCase.ts` | normalize, validate, reject reserved, check uniqueness |
| Controller | `apps/api/controllers/UserController.ts` | one line: `if ('handle' in body) input.handle = body.handle` |
| Web DTOs | `apps/web/client/features/users/types.ts` | `handle` on `UserPublic`; optional on `UserProfileUpdate` |
| Web UI | `pages/profile/ProfileEditForm.tsx`, `ProfileDetails.tsx`, `ProfilePage.tsx` | handle field, public URL row, handle-first links |

## Gotchas found while reading the code

These are the things that will bite an implementer who skips the research:

- **Postgres regex is POSIX ERE**, so `(?:...)` is not available in a `check` constraint. Use a plain form such as `^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$` (3–30 characters, no leading or trailing separator).
- **Case-insensitive uniqueness needs a decision.** Simplest is to store lowercase only and enforce it with a `check (handle = lower(handle))` alongside the unique index, normalizing in the domain before save.
- **Soft deletes vs. the unique index.** `findById` filters `deleted_at is null`, and `findByHandle` must do the same. But a unique index still covers soft-deleted rows, so a deleted user keeps their handle reserved forever unless the migration or delete path releases it. Decide deliberately.
- **Validation cannot live in `applyProfileUpdate`.** That method returns `void` and only applies keys that are not `undefined`. Format, reserved-word, and uniqueness failures must surface from `UpdateUserUseCase` as `Result.failure(...)`.
- **No HTTP mapping work.** `HttpErrorMapper` just reads `status` off the `ResultError`, so a new error only needs its status set in the catalog.
- **The partial-update contract is load-bearing.** `UserController.updateUser` copies only keys present in the body, and `applyProfileUpdate` ignores `undefined`. Preserve that when adding `handle`, or avatar-only saves from `AvatarEditor` will start clobbering the handle.
- **Reserve the sentinel.** `USER_PROFILE_SENTINEL_ID` is the nil UUID and must never be claimable as a handle. Keep the reserved list in the domain rather than the database.
- **`search_vector` is a generated column** over `display_name` only. If handles should be searchable, that generated expression has to change — a separate decision from this slice.
- **RLS is defense in depth.** `users_public_read` and `users_owner_update` exist, but the API uses the service role and bypasses RLS; ownership is enforced in the use cases. A handle rename needs no policy change.

## Open questions to settle first

1. Is a handle **required** at signup, or optional and claimed later? Optional is less disruptive — `handle text` stays nullable and existing rows need no backfill.
2. Can a handle be **changed**, and if so how often? Renaming silently breaks every shared link and QR code that used the old one.
3. Should the old URL **redirect** after a rename, and for how long? That implies a history table, which is out of scope unless decided now.
4. What is on the **reserved list** beyond the sentinel — `admin`, `api`, `me`, `new`, `settings`, `support`?

## Tests to add

- `test/api/users.test.ts` (already exists): fetch by handle; fetch by uuid still works; rename; duplicate handle returns 409 `HANDLE_TAKEN`; bad format returns 400 `HANDLE_INVALID`; reserved word rejected; an avatar-only `PUT` leaves the handle untouched.
- Web unit fixtures gain the new field: `test/web/unit/ProfilePage.test.tsx`, `PublicProfilePage.test.tsx`, `AvatarEditor.test.tsx`.

## Related

- [Fosterfolio MVP plan](fosterfolio_mvp.plan.md) — scope boundary that puts vanity slugs in v2
- [Open TODO](todo.md) — pre-go-live operator work, tracked separately from this
- [Supabase migrations](../playbooks/supabase-migrations.md) — naming and `npm run supabase:push`
- [`apps/web/client/pages/AGENTS.md`](../../apps/web/client/pages/AGENTS.md) — route-folder conventions for the profile surface
