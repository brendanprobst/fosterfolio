---
name: User handles (vanity URLs)
overview: Add a unique `handle` to users and a root-level `/@handle` route family — profile, a stable "current foster" pointer at `/@handle/foster-me`, and pet bios at `/@handle/pet/{id}` — replacing `/users/{id}` and `/pets/{id}`. Written from research done on 2026-09-26; extended twice more the same day, first with the routing design and then with user-confirmed decisions on all of it. The implementing agent should not need to re-derive any of the three passes.
todos:
  - id: handle-messaging
    content: "foster-me needs a visible disclaimer when it falls back to a non-actively_fostering pet, and a browse/profile CTA on the true empty state — see \"Messaging for the fallback and empty-state cases\""
    status: completed
  - id: handle-migration
    content: "Migration: add `public.users.handle` with a unique index and a POSIX format check"
    status: completed
  - id: handle-domain
    content: "Domain: `UserHandle` value object (normalize, validate, small impersonation blocklist) plus `handle` on `UserProps` / DTOs / `toPersistence`"
    status: completed
  - id: handle-errors
    content: "Errors: `HANDLE_INVALID` (400) and `HANDLE_TAKEN` (409) in `UserErrors` and the `ErrorCatalog` facade"
    status: completed
  - id: handle-repositories
    content: "Repositories: `findByHandle` on `IUserRepository`, the Supabase `UserRepository`, and `InMemoryUserRepository`"
    status: completed
  - id: handle-use-cases
    content: "Use cases: `GetUserUseCase` resolves uuid-or-handle; `UpdateUserUseCase` validates format, blocklist, and uniqueness; foster-me needs a small resolution step (handle → user id → sorted pets → apply the selection rule)"
    status: completed
  - id: handle-routes
    content: "Web routes: root-level `app/[handle]/page.tsx`, `.../foster-me/page.tsx`, `.../pet/[petId]/page.tsx`, replacing `app/users/[id]` and `app/pets/[id]` (confirmed retired)"
    status: completed
  - id: handle-edge
    content: "Edge: one CloudFront function branch — first segment starts with `@` → rewrite to the matching sentinel — replacing the `/users` and `/pets` branches"
    status: completed
  - id: handle-callers
    content: "Update every `petBioHref`/`userProfileHref` call site to the new decorative-segment shape; thread an owner id into `PetQrDownload.tsx`, the one caller with no owner reference today"
    status: completed
  - id: handle-web-ui
    content: "Web UI: `handle` field in the edit dialog, handle-first public profile links"
    status: completed
  - id: handle-tests
    content: "Tests: API coverage for lookup/rename/conflict/invalid; a CloudFront-rewrite unit test mirroring `cloudfrontPetRewrite.test.ts`; updated web fixtures"
    status: completed
---

# User handles (vanity URLs)

State as of commit `9cd1da2`, before any of this was implemented. This document was written in two passes: the original handle/lookup slice on 2026-09-26, then extended the same day after a design discussion about the actual URL structure. Both passes are folded in below as one plan.

## Decision

Build the real feature: a unique `handle` column, API lookup by id **or** handle, and a handle field in the profile edit dialog. This was chosen on 2026-09-26 over the cheaper alternative of merely displaying a copyable `/users/{uuid}` on the profile page.

Note that this pulls a **v2 item into the current scope**. The [MVP plan](fosterfolio_mvp.plan.md) lists vanity slugs under what is explicitly *not* in the MVP, and again as a later "sharing that converts" item. Nothing in the codebase contradicts that — a search for `handle`, `username`, `vanity`, and `slug` across the web client, API domain, DTOs, and migrations finds no such field today.

A follow-up discussion the same day set the actual URL shape (below), which is a **bigger change than the original pass scoped**. The original research assumed handles would simply replace `id` inside the existing `/users/{id}` prefix — true, and still valid for the *API* route (`GET /users/:id` stays opaque either way). The web-routing decision below moves the **web app's route folders** to root level instead, which the API doesn't need to know about at all.

A second follow-up the same day confirmed every open call from that routing pass — the pet-URL shape gained an explicit `pet/` segment, both previously-defaulted decisions are now settled, not just defaulted, and a new messaging requirement was added for two of the `foster-me` outcomes. All confirmed below.

## URL structure

```
/@brendan                              → profile
/@brendan/foster-me                    → the owner's current/latest foster (stable — see below)
/@brendan/pet/{petId}                  → a specific pet, permalink
/@f05e0000-0000-4000-8000-000000000001 → same three shapes, uuid fallback when no handle is set
```

The explicit `pet/` segment (rather than `/@brendan/{petId}` directly) was chosen for readability — `/@brendan/pet/abc123` reads unambiguously as "a pet," where a bare `/@brendan/abc123` could be mistaken for anything. It also gives the CloudFront rewrite a literal keyword to match on for this branch, alongside the literal `foster-me` for that one.

### Why the `@` sigil, specifically

The alternative — bare `/{handle}` at root, no sigil — permanently collides with every static route this app has (`/search`, `/profile`, `/auth/*`, `/ui`) and every one it will ever add (`/pricing`, `/help`, ...). That forces a reserved-word blocklist kept in sync in two places forever: wherever a handle is validated, and in the CloudFront function that decides whether a request is a real static route or a handle to rewrite. Miss one and a future static route either 404s or gets misrouted to a profile sentinel.

The `@` sigil removes the collision class entirely rather than managing it: no legitimate static route is ever named `@something`, so the CloudFront rule becomes "does segment one start with `@`? yes → handle family; no → normal static resolution or 404." One `if`, not a list. It also happens to be the most recognizable "this is a person" URL convention on the web (X/Twitter, Instagram, Threads, Medium), so it doubles as free UX clarity.

One clarification worth stating plainly since it's easy to get backwards: Next.js's App Router treats `@` specially only when it's the **folder name itself** (the parallel-routes convention, e.g. `@modal/`). The route folder here is named `[handle]` with plain brackets; `@` only ever appears in the **matched value**, which Next.js does not treat specially. No conflict with the framework.

### The handle segment in a pet URL is decorative, not validated

`/@brendan/pet/{petId}` does **not** check that `petId` actually belongs to `brendan`. It just renders whatever pet the id resolves to, exactly like `app/pets/[id]/page.tsx` does today — the leading segment is cosmetic, the same convention Reddit uses (`/r/sub/comments/postid/some-title`, where the title text is decorative and the id is authoritative). This is deliberate, not an oversight: enforcing the match would need an extra repository lookup on every request, plus a real decision about what happens on a mismatch (404? redirect to the correct owner?) for close to zero user-facing benefit, since a wrong-but-plausible-looking link still lands on the right pet. **Confirmed** — the only way to hit a mismatched handle/pet pair is manually editing the URL, an accepted edge case.

**This is also why retiring `/pets/{id}` turns out to be cheap — confirmed, not just defaulted.** Every current caller of `petBioHref` already holds *some* id it can drop into that decorative slot, with zero new data fetching, because the segment doesn't need to be a real handle — a raw uuid works too (see "uuid fallback" above):

| Caller | Already has | New link |
|---|---|---|
| `PetBioPage.tsx` | `pet.owner.id` | `/@{pet.owner.id}/pet/{pet.id}` |
| `PublicProfilePage.tsx` | the profile's own `user.id` | `/@{user.id}/pet/{pet.id}` |
| `SearchPage.tsx` | `SearchPetHit.ownerId` | `/@{ownerId}/pet/{pet.id}` |
| `PostCard.tsx` | `PostPublic.authorId` | `/@{authorId}/pet/{pet.id}` |
| `ProfilePage.tsx` | the signed-in `user.id` | `/@{user.id}/pet/{pet.id}` |
| `PetQrDownload.tsx` | **nothing** — only `petId`/`petName` today | needs a new `ownerId` prop threaded from `PetBioPage` |

Once handles exist, each of those can be upgraded to the real handle where convenient (nicer-looking link), but none of them are *blocked* on it — the uuid form is always valid. `PetQrDownload.tsx` is the one real gap: it has no owner reference at all right now and needs a prop added. **Confirmed low-risk to change**: no QR codes exist in the real world yet, so there's nothing printed anywhere to invalidate.

### `foster-me` must not redirect

`/pets/{id}` (or its replacement, `/@x/{petId}`) is a **permalink** — always the same pet, forever. `/@handle/foster-me` is deliberately the opposite: a stable address whose *target* changes over time as the person's fostering situation changes. If someone prints this on a QR code today, scanning it next year should show whoever they're fostering then — that's the entire point.

So this route must not do a client-side `router.replace` down to a concrete `/@handle/pet/{petId}` (which would leave the address bar pointing at one pet, undermining the "always current" promise for anyone who re-shares from the bar). It renders pet-bio content directly, resolving "which pet" fresh on every load: `@handle` → user id (the one lookup this feature needs anyway) → the existing `GET /users/:id/pets` endpoint, already sorted `created_at.desc` by `PetRepository.findByOwnerId` → apply the selection rule (below). No new API endpoint required beyond the handle→id resolution.

### Two decisions, now confirmed

Both of these were shipped as *defaults* in the previous pass and are now explicitly confirmed, not just defaulted:

**Retire `/pets/{id}` in favor of `/@x/pet/{petId}` as the sole canonical pet URL — confirmed yes.** The table above shows this is cheap: one prop threaded into `PetQrDownload.tsx`, everything else just reshapes an id it already has. One canonical shape, not two carried forever. `app/pets/[id]/page.tsx` goes away.

**What `foster-me` actually selects — confirmed: most recent pet with `status = actively_fostering`; if none qualify, the most recent pet overall; if the owner has zero pets, an empty state.** "Latest" and "active" can disagree — a foster's newest pet might already be adopted while an older one is still in their care — so this prefers the status that matches the feature's name, with recency as the tiebreaker and fallback. Confirming this outcome also settles a new requirement: the two non-ideal outcomes (fallback pet, empty state) both need a visible message, not a silent substitution — see below.

### Messaging for the fallback and empty-state cases

`foster-me` has three outcomes; only the first is unambiguous. **This section is my reading of a somewhat open-ended instruction ("a clear message... that there's possibility to adopt this specific pet, or to view a pet if none are found") — treat the exact copy as a first draft, not settled, unlike the two decisions above.**

1. **A pet is currently `actively_fostering`.** No extra messaging — the pet-bio content already shown is accurate as-is.
2. **No pet is `actively_fostering`; falls back to the most recent pet overall.** The status shown could be `available`, `adopted`, or `medical_hold` — the visitor shouldn't assume this pet is still with this foster. Show a small notice above the pet-bio content, e.g. *"This may not be who {displayName} is fostering right now — ask below if {petName} is still looking for a home."*, pointing at the `InquiryForm` already on the pet-bio layout so the notice has an immediate next action rather than just a caveat.
3. **The owner has zero pets.** A true empty state, e.g. *"{displayName} isn't listed as fostering anyone right now."*, with two links: to the full profile (already planned for this page) and to browse other pets (`/search`), so the visitor isn't dead-ended.

## What already supports this

The MVP plan anticipated the *data-layer* half: *"Pet lookup resolves by id-or-slug at the repository seam even though only ids exist in MVP, so v2 vanity slugs touch neither the route nor the edge config."* That's still true for the API:

- **API routes are already opaque.** `apps/api/routes/users.ts` mounts `GET /:id`, `PUT /:id`, `/:id/pets`, `/:id/posts`, `/:id/star-count`, `POST /:id/star`. The param is just a string; `GetUserUseCase` resolving uuid-or-handle needs no route change.

It is **not** true for the *web* routing, and the original research pass overstated this — worth correcting explicitly: the web app needs new root-level route folders (`app/[handle]/`, `.../foster-me/`, `.../pet/[petId]/`), and the CloudFront viewer-request function needs a real new branch, not zero edge work. See "The slice, layer by layer" below.

## The slice, layer by layer

| Layer | File | Change |
|---|---|---|
| Schema | new `supabase/migrations/<ts>_app_user_handles.sql` | `handle text`, unique index, format check |
| Domain value | new `apps/api/domain/value-objects/UserHandle.ts` | normalize, validate, small impersonation blocklist (`admin`, `support`, `fosterfolio`, ...) — no longer load-bearing for routing, see gotchas |
| Entity | `apps/api/domain/entities/User.ts` | `handle` on `UserProps`, `UserPublicDto`, `applyProfileUpdate`, `toPublicDto`, `toPersistence` |
| Errors | `apps/api/domain/errors/catalogs/UserErrors.ts`, `ErrorCatalog.ts` | `HANDLE_INVALID` 400, `HANDLE_TAKEN` 409 |
| Port | `apps/api/domain/repositories/IUserRepository.ts` | add `findByHandle` beside `findById` / `save` / `countStars` |
| Supabase adapter | `apps/api/infrastructure/repositories/UserRepository.ts` | add `handle` to `USER_SELECT` and `UserRecord`; implement `findByHandle` |
| In-memory adapter | `apps/api/infrastructure/repositories/InMemoryUserRepository.ts` | implement `findByHandle` over the `Map` |
| Read | `apps/api/application/use-cases/GetUserUseCase.ts` | UUID → `findById`, otherwise → `findByHandle` |
| Write | `apps/api/application/use-cases/UpdateUserUseCase.ts` | normalize, validate, reject blocklisted, check uniqueness |
| Controller | `apps/api/controllers/UserController.ts` | one line: `if ('handle' in body) input.handle = body.handle` |
| **New web route** | `apps/web/app/[handle]/page.tsx` | profile — replaces `app/users/[id]/page.tsx` |
| **New web route** | `apps/web/app/[handle]/foster-me/page.tsx` | resolves handle → id → sorted pets → selection rule → messaging (see above); renders pet-bio content in place, no redirect |
| **New web route** | `apps/web/app/[handle]/pet/[petId]/page.tsx` | pet bio, handle decorative — replaces `app/pets/[id]/page.tsx` (confirmed retired) |
| **Edge** | `infra/terraform/cloudfront/functions/viewer_request_next_static_export.js` | replace the `/users` and `/pets` prefix branches with one `@`-prefix branch: one segment → profile sentinel, `/foster-me` → that sentinel, `/pet/{anything}` → the pet sentinel |
| Web helpers | `apps/web/client/lib/userProfilePath.ts`, `petBioPath.ts` | new shape: `handleHref(handleOrId)`, `petHref(ownerIdOrHandle, petId)`, `fosterMeHref(handleOrId)` |
| Web callers | see table above | `PetBioPage.tsx`, `PublicProfilePage.tsx`, `SearchPage.tsx`, `PostCard.tsx`, `ProfilePage.tsx`, `PetQrDownload.tsx` (needs a new prop) |
| Web DTOs | `apps/web/client/features/users/types.ts` | `handle` on `UserPublic`; optional on `UserProfileUpdate` |
| Web edit UI | `apps/web/client/pages/profile/ProfileEditForm.tsx` | handle field (location/shelters/links already live in `ProfileLocationCard.tsx` / `ConnectedSitesCard.tsx` / `SocialLinksDialog.tsx` as of the profile-page facelift — the original research pass's reference to a since-deleted `ProfileDetails.tsx` is stale) |

## Gotchas found while reading the code

- **Postgres regex is POSIX ERE**, so `(?:...)` is not available in a `check` constraint. Use a plain form such as `^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$` (3–30 characters, no leading or trailing separator).
- **Case-insensitive uniqueness needs a decision.** Simplest is to store lowercase only and enforce it with a `check (handle = lower(handle))` alongside the unique index, normalizing in the domain before save.
- **Soft deletes vs. the unique index.** `findById` filters `deleted_at is null`, and `findByHandle` must do the same. But a unique index still covers soft-deleted rows, so a deleted user keeps their handle reserved forever unless the migration or delete path releases it. Decide deliberately.
- **Validation cannot live in `applyProfileUpdate`.** That method returns `void` and only applies keys that are not `undefined`. Format, blocklist, and uniqueness failures must surface from `UpdateUserUseCase` as `Result.failure(...)`.
- **No HTTP mapping work.** `HttpErrorMapper` just reads `status` off the `ResultError`, so a new error only needs its status set in the catalog.
- **The partial-update contract is load-bearing.** `UserController.updateUser` copies only keys present in the body, and `applyProfileUpdate` ignores `undefined`. Preserve that when adding `handle`, or avatar-only saves from `AvatarEditor` will start clobbering the handle.
- **The `@` sigil makes a routing-necessity reserved list unnecessary — the sentinel still needs guarding, but for a different reason.** With the sigil, no *plain-word* handle can ever collide with a static route, so the original "reserve `admin`, `api`, `me`, `new`, `settings`..." concern mostly evaporates as a *routing* problem. What's left is a much smaller, product-policy blocklist purely against impersonation/confusion (`admin`, `support`, `fosterfolio`, `official`) — not required for correctness, worth having anyway. The one entry that *is* still required: the nil-UUID sentinel value itself must never be claimable as a handle.
- **`foster-me` does not need to be reserved.** It occupies the *second* URL segment (`/@anyone/foster-me`); a handle occupies the *first* (`/@foster-me` would be that user's own profile). These are different positions — a user handled `foster-me` and the literal `foster-me` sub-route never collide.
- **`search_vector` is a generated column** over `display_name` only. If handles should be searchable, that generated expression has to change — a separate decision from this slice.
- **RLS is defense in depth.** `users_public_read` and `users_owner_update` exist, but the API uses the service role and bypasses RLS; ownership is enforced in the use cases. A handle rename needs no policy change.

## Open questions

1. Is a handle **required** at signup, or optional and claimed later? Optional is less disruptive — `handle text` stays nullable and existing rows need no backfill.
2. Can a handle be **changed**, and if so how often? Renaming changes every shared link and QR code that used the old one — no live traffic yet, so this is a smaller concern than it will be later, but still worth an explicit answer once beta users exist.

Retiring `/pets/{id}`, the `foster-me` selection rule, and the pet URL's `/pet/` segment are all confirmed — see "Two decisions, now confirmed" above. The exact copy in "Messaging for the fallback and empty-state cases" is the one piece in this document that is a draft, not a confirmed decision.

## Tests to add

- `test/api/users.test.ts` (already exists): fetch by handle; fetch by uuid still works; rename; duplicate handle returns 409 `HANDLE_TAKEN`; bad format returns 400 `HANDLE_INVALID`; blocklisted word rejected; an avatar-only `PUT` leaves the handle untouched.
- A CloudFront-rewrite unit test mirroring the existing `test/web/unit/cloudfrontPetRewrite.test.ts` pattern, covering the new `@`-prefix branch (handle-only, handle + `foster-me`, handle + `pet/{id}`) and confirming plain static routes (`/search`, `/profile`) pass through untouched.
- The `foster-me` route's three outcomes, since each renders different content: an `actively_fostering` pet with no extra messaging; a fallback pet with the disclaimer visible; zero pets with the empty state and its two links.
- Web unit fixtures gain the new field / new hrefs: `test/web/unit/ProfilePage.test.tsx`, `PublicProfilePage.test.tsx`, `AvatarEditor.test.tsx`, `userProfilePath.test.ts`, `petBioPath.test.ts`.

## Related

- [Fosterfolio MVP plan](fosterfolio_mvp.plan.md) — scope boundary that puts vanity slugs in v2
- [Open TODO](todo.md) — pre-go-live operator work, tracked separately from this
- [Supabase migrations](../playbooks/supabase-migrations.md) — naming and `npm run supabase:push`
- [`apps/web/client/pages/AGENTS.md`](../../apps/web/client/pages/AGENTS.md) — route-folder conventions for the profile surface
