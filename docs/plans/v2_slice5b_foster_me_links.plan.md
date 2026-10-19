---
name: v2 slice 5b — foster-me tracked links + owner analytics
overview: Make the foster parent's foster-me URL the primary tracked-link target. Tracked links gain a `target` (`pet` | `foster_me`); the backend supports both, the UI only creates foster-me links. Foster-me becomes a lightweight preview page (XXXL avatars of active fosters) instead of a full pet bio. Links management moves to one owner-level page with a modal create flow and a first-link tutorial. Owner-level analytics (preview views → pet taps → inquiries) live on that page. Depends on slice 5a (chart primitives, QrDownloadMenu, OwnerPageLayout, trimmed presets).
status: pending
todos:
  - id: 5b-todo-md
    content: "Add §8 'v2 slice 5b' to docs/plans/todo.md linking this plan; tick items as they land"
    status: completed
  - id: 5b-schema
    content: "Migration: tracked_links.target + nullable pet_id; analytics_owner_daily (views + pet_taps); inquiries.via_foster_me"
    status: completed
  - id: 5b-api-links
    content: "Domain + API: foster-me link create/list, resolve returns target, reserved `default` channel"
    status: completed
  - id: 5b-events-rollup
    content: "foster_me_viewed event, per-pet via-foster-me marker on taps + inquiries, owner rollup into analytics_owner_daily"
    status: completed
  - id: 5b-owner-analytics-api
    content: "GET /me/links/analytics: owner funnel + per-link stats (preview views, pet taps, inquiries)"
    status: completed
  - id: 5b-preview-page
    content: "Foster-me preview page: XXXL avatars, name/weight/age only, multi-pet responsive, taps go to pet bio"
    status: completed
  - id: 5b-links-page
    content: "/profile/links: modal create, first-link tutorial + intro dialog, pulsing empty state, always-visible custom channel input, legacy pet links read-only"
    status: completed
  - id: 5b-rewire
    content: "Rewire entry points, per-pet analytics link names, retire /pets/[id]/links and the summary endpoint"
    status: completed
---

# v2 slice 5b — foster-me tracked links + owner analytics

## Context

During the 2026-10-09 stress test, the per-pet links page proved confusing, and per-pet links fight with the foster-me URL. Foster-me is the stable "whoever I'm fostering now" address, and a lawn sign pointing at it never goes stale. Decisions made in planning:

- **Backend supports both targets, UI exposes only foster-me.** `tracked_links.target` is `pet` or `foster_me`. Every existing row becomes `target = 'pet'` and keeps resolving to its pet with history intact. New links from the UI are always `foster_me`. If pet-specific flyers are ever requested, exposing `pet` again is a UI-only change.
- **Foster-me is a preview, not a pet bio.** It shows the active fosters as big avatar cards: photo, name, weight, age, nothing else. A visitor taps a pet to reach its bio.
- **View counting:** the preview page records `foster_me_viewed` (owner-level). `pet_viewed` fires only when a pet's bio is actually opened, including after a tap from the preview. Today foster-me fires `pet_viewed` for the shown pet on load; that stops.
- **Attribution:** first-touch in sessionStorage already carries `link_id`/`channel_key` from `foster-me?s=code` onto `pet_viewed` and the inquiry.
- **Via-foster-me marker (solves untagged foster-me traffic):** link attribution alone can't tell an untagged foster-me visit (someone typed or shared the plain foster-me URL) from a visitor who went straight to a pet's URL; both show as Direct. So every tap from the preview marks *that pet* as reached via foster-me, and the mark rides along on `pet_viewed` and on the inquiry. It's per-pet, not per-session: a visitor who later opens a different pet by its own URL is not counted as a foster-me tap. See 5b-events-rollup.
- **No default link exists by default.** The first link a foster parent creates is the tutorial's "default link."

**Estimate (AI-assisted):** ~1.5 focused sessions. Schema + API + rollup ≈ 0.5, preview page ≈ 0.25, links page ≈ 0.5, rewiring + tests ≈ 0.25.

### Execution order

`5b-todo-md` → `5b-schema` → `5b-api-links` → `5b-events-rollup` → `5b-owner-analytics-api` → `5b-preview-page` → `5b-links-page` → `5b-rewire`

Backend first, so both UI tickets build on the final model.

### Ground rules

- Follow Lattice DDD conventions: domain → use case → repository interface → Supabase + in-memory repos → controller → route → `Container`. Errors via `ErrorCatalog` + `HttpErrorMapper`.
- New migrations go through the repo's migration structure (`supabase/migrations/` + `feature-migrations`/`master-migration` as `supabase/AGENTS.md` describes). Seed data (`npm run supabase:seed`) gets a foster-me link example.
- Tests alongside each change; `npm run ci` green per ticket.
- Static export: new owner pages live under `/profile/*` so no new CloudFront sentinel is needed.
- Keep `packages/analytics` app-agnostic: "entry surface" and "target" are generic concepts there, not "foster-me."

---

## 5b-todo-md — Wire into todo.md

**Acceptance criteria.** Add `## 8. v2 slice 5b — foster-me links` to `docs/plans/todo.md`, listing each ticket and linking this plan. Close §4's "foster-me and pet bio should not be the same page" item with "Done in 5b — foster-me is a preview page." Note in that line that the old idea of putting the inquiry form on foster-me is superseded: the preview is intentionally minimal and inquiries happen on the pet bio.

**Agent.** Main session.

**Prompt.**
> Add a §8 section to `docs/plans/todo.md` listing every ticket in `docs/plans/v2_slice5b_foster_me_links.plan.md` as an unchecked line linking the plan. Update the §4 foster-me item as described in the 5b-todo-md ticket. Touch nothing else.

---

## 5b-schema — Migration

**Description.** Links need an owner-level target, and owner-level views need somewhere to land. `analytics_daily` is keyed on a non-null `pet_id` and feeds every per-pet query, so leave it untouched and add a sibling table instead of loosening it.

**Acceptance criteria.**
```sql
alter table public.tracked_links
  add column target text not null default 'pet'
    check (target in ('pet', 'foster_me')),
  alter column pet_id drop not null,
  add constraint tracked_links_target_pet_consistency
    check ((target = 'pet') = (pet_id is not null));

create index tracked_links_owner_target_idx
  on public.tracked_links (owner_id, target) where archived_at is null;

create table public.analytics_owner_daily (
  owner_id uuid not null references public.users (id) on delete cascade,
  link_id uuid references public.tracked_links (id) on delete set null,
  channel_key text not null,
  city text,
  day date not null,
  views int not null default 0,          -- foster_me_viewed (preview views)
  approx_visitors int not null default 0,
  pet_taps int not null default 0,       -- pet_viewed with via_foster_me = true
  updated_at timestamptz not null default now()
);
create unique index analytics_owner_daily_uniq on public.analytics_owner_daily (
  owner_id,
  coalesce(link_id, '00000000-0000-0000-0000-000000000000'::uuid),
  channel_key, coalesce(city, ''), day
);
```
- `alter table public.inquiries add column via_foster_me boolean not null default false;` Existing inquiries backfill to false, which is correct, since no preview page existed before.
- RLS on `analytics_owner_daily`: owners select their own rows; no authenticated writes (the rollup writes with the service role).
- The default `'pet'` backfills existing rows. The API always sets `target` explicitly from now on.
- The migration is idempotent per repo convention, and seed data includes one `foster_me` link.

**Agent.** infra-expert (migration + seed) + test-expert.

**Prompt.**
> Write a new Supabase migration per `supabase/AGENTS.md` that adds `target` and makes `pet_id` nullable on `tracked_links` (with the consistency check and partial index in the 5b-schema ticket), creates `analytics_owner_daily` (including the `pet_taps` column) with its unique index and owner-select RLS, and adds `inquiries.via_foster_me boolean not null default false`. Mirror the policies on `analytics_daily`. Update the seed so one owner has a `foster_me` link. Verify against local Supabase that existing rows read back as `target = 'pet'`.

---

## 5b-api-links — Domain + API for foster-me links

**Description.** Extend the tracked-link domain to carry `target`, add owner-level create/list endpoints, and make resolve tell the client what it resolved to.

**Acceptance criteria.**
- `TrackedLink` entity/DTO gains `target: 'pet' | 'foster_me'` and nullable `petId`. Domain invariant: `foster_me` ⇒ no pet; `pet` ⇒ pet required.
- `POST /me/links` creates a `foster_me` link: body `{ channelKey?, channelName?, label? }`, channel resolved with `resolveChannel` as today.
- **Reserved `default` channel:** `POST /me/links` with `{ isDefault: true }` creates `channel_key = 'default'`, `channel_name = 'Default'`, `label = "{displayName}'s default link"`. Only one active default per owner (409 `TRACKED_LINK_DEFAULT_EXISTS`). `resolveChannel` rejects `default` from user input. `ListChannelsUseCase` excludes `default` from the picker.
- `GET /me/links` lists every owner link, both targets, archived included, each with `target`, `petId`, and (for `pet` targets) pet name.
- `GET /links/resolve/:code` returns `{ linkId, channelKey, target, petId | null, ownerId }`.
- Existing `POST /pets/:id/links` and `GET /pets/:id/links` keep working (`target = 'pet'`), with no UI caller after 5b-rewire. Leave a comment saying they're kept on purpose.
- `PATCH /links/:id` (label, channel, archive) works for both targets; changing `target` is not allowed.
- Jest: invariants, default uniqueness, resolve shape for both targets, channels list excludes `default`.

**Agent.** ddd-expert + test-expert.

**Prompt.**
> Extend the tracked-link domain in `apps/api` with `target` ('pet' | 'foster_me') and nullable `petId`, enforcing the invariant in the entity. Add `CreateOwnerLinkUseCase` (`POST /me/links`, supports `isDefault` → reserved `default` channel, one active default per owner, new `TRACKED_LINK_DEFAULT_EXISTS` 409 in `TrackedLinkErrors`/`ErrorCatalog`/`HttpErrorMapper`) and `ListOwnerLinksUseCase` (`GET /me/links`, all targets, archived included). Make `ResolveTrackedLinkUseCase` return `{ linkId, channelKey, target, petId, ownerId }`. Exclude `default` in `ListChannelsUseCase` and reject it as user input in `resolveChannel`. Update both repositories (Supabase + in-memory) and register everything in `Container`. Jest tests for every new path; keep the existing pet-link endpoints passing.

---

## 5b-events-rollup — foster_me_viewed, via-foster-me marker, owner rollup

**Description.** Add the owner-level preview event, a per-pet "reached via foster-me" marker, and the owner rollup.

The problem this ticket solves: `?s=` link attribution only covers *tagged* foster-me URLs. When someone types or shares the plain `/@handle/foster-me` URL and taps a pet, the resulting `pet_viewed` and inquiry show as Direct, identical to a visitor who opened the pet's own URL. Without a marker, the owner funnel would undercount pet taps and inquiries from untagged foster-me traffic, which is likely most of it early on.

**How the marker works.**
1. Preview cards link to the pet bio with a one-shot query param: `/@handle/pet/{id}?via=foster-me`. A URL param, not just sessionStorage, so it survives "open in new tab" and long-press on mobile.
2. On pet bio load, if `via=foster-me` is present: add the pet id to a sessionStorage set (`ff_via_foster_me`), then strip the param with `history.replaceState` so it isn't copied into shares or bookmarks.
3. `pet_viewed`, `inquiry_form_opened`, and `inquiry_submitted` carry `via_foster_me: true` when the current pet id is in that set.
4. `POST /inquiries` accepts `viaFosterMe` and persists it to `inquiries.via_foster_me`.

It's per pet, not per session: tapping Biscuit from the preview and then opening Mochi by her own URL counts only Biscuit as a foster-me tap. Refreshing the Biscuit bio keeps the mark, since the set survives the param being stripped.

Keep `packages/analytics` generic: add a tiny `entityMarks` helper (`markEntity(key, id)`, `hasEntityMark(key, id)`, plus one-shot URL-param consumption with a configurable param name) with no foster-me wording. The app supplies the key `via_foster_me` and the param `via=foster-me`.

**Acceptance criteria.**
- New event `foster_me_viewed`: `{ owner_id, link_id, channel_key, referrer_domain, pet_count }`. Captured once per preview mount; suppressed for the owner and when the owner has no pets.
- `pet_viewed`, `inquiry_form_opened`, `inquiry_submitted` gain a boolean `via_foster_me` per the rules above.
- `POST /inquiries` accepts optional `viaFosterMe` (default false) and stores it. Jest test.
- The rollup Lambda (`apps/api/analyticsRollup.ts`) runs one more HogQL query, grouped by `owner_id, link_id, channel_key, city, day`, computing `countIf(event = 'foster_me_viewed')` as `views`, an approx-visitors count for previews, and `countIf(event = 'pet_viewed' AND properties.via_foster_me)` as `pet_taps`. It upserts into `analytics_owner_daily` via a new `IAnalyticsOwnerDailyRepository`. The existing per-pet query is unchanged.
- Untagged foster-me traffic lands in `analytics_owner_daily` with `link_id = null` and `channel_key = 'direct'`, so it is counted, not lost.
- Vitest: param consumed and stripped; mark persists across refresh; opening another pet directly is not marked; events carry the flag. Jest: rollup maps both columns; inquiry persists the flag.

**Agent.** infra-expert (rollup, adapters) + test-expert.

**Prompt.**
> In `packages/analytics`, add a generic `entityMarks` helper: `markEntity(key, id)` and `hasEntityMark(key, id)` backed by sessionStorage, plus `consumeMarkFromUrl({ param, value, key, id })` that marks the entity when the URL has `param=value` and then strips the param via `history.replaceState`. Nothing foster-specific in the package. In `apps/web`, link foster-me preview cards to `/@handle/pet/{id}?via=foster-me`, consume the mark on pet bio load (key `via_foster_me`), and add `via_foster_me` to `pet_viewed`, `inquiry_form_opened`, and `inquiry_submitted`, plus `viaFosterMe` on the inquiry POST. Add a `foster_me_viewed` capture helper (`owner_id, link_id, channel_key, referrer_domain, pet_count`), suppressed for owners. In the API, accept and persist `viaFosterMe` in `CreateInquiryUseCase`. In `apps/api/analyticsRollup.ts`, add an owner query grouped by owner/link/channel/city/day producing `views`, `approx_visitors`, and `pet_taps` (pet_viewed where via_foster_me), upserting into `analytics_owner_daily` through a new repository interface + Supabase/in-memory implementations wired in `Container`. Tests per the ticket.

---

## 5b-owner-analytics-api — Owner funnel endpoint

**Description.** One endpoint for the links page: an owner-level funnel and per-link stats.

**Acceptance criteria.**
- `GET /me/links/analytics?range=7d|30d|all` returns:
  - `funnel`: `previewViews` (sum `analytics_owner_daily.views`), `petTaps` (sum `analytics_owner_daily.pet_taps`), `inquiries` (count of this owner's inquiries with `via_foster_me = true`)
  - `byLink[]`: `{ linkId, previewViews, petTaps, inquiries }`, where inquiries per link = `via_foster_me = true` and `source_link_id = linkId`. Untagged traffic is returned as a separate `untagged` row (`linkId: null`), not dropped.
  - `previewViewsByDay[]` and `inquiriesByDay[]`
- Same range semantics as the pet analytics range helpers. Reuse `startDayForRange`.
- Owner-only (JWT); zero-data returns zeros, not 404.
- Jest coverage with in-memory repos, including a link with views but no inquiries, an archived link that still counts, and untagged foster-me traffic showing up in the `untagged` row.

**Agent.** ddd-expert + test-expert.

**Prompt.**
> Add `GetOwnerLinkAnalyticsUseCase` and `GET /me/links/analytics?range=` in `apps/api`. Compute previewViews and petTaps from `analytics_owner_daily`, and inquiries from the owner's inquiries where `via_foster_me = true` (grouped by `source_link_id`, with null as the untagged row). Return funnel, byLink, previewViewsByDay, and inquiriesByDay. Reuse the range helpers in `application/analytics/petAnalytics.ts`. Jest tests with in-memory repos.

---

## 5b-preview-page — Foster-me preview

**Description.** Replace `FosterMePage`'s full `PetBioView` render with a minimal preview.

**Acceptance criteria.**
- Each active foster renders as an XXXL circular avatar card (cover photo, `primaryPhotoUrl`), name, weight (the `size` field; UI says Weight), and age. Nothing else. The whole card is a link to `/@handle/pet/{id}`.
- **One active pet:** large centered card. Copy: "Meet {name}" with a small "fostered by {displayName}".
- **Multiple active pets:** responsive grid (1 column below ~480px, 2 on tablet, up to 3 on desktop), avatars sized to fit. Copy: "Meet the pets {displayName} is fostering."
- **Zero active pets:** keep the existing `selectFosterMePet` fallback (most recent pet) in the same card style with the existing fallback disclaimer. The true-empty state is unchanged.
- Capture `foster_me_viewed` on mount. Do NOT fire `pet_viewed` here anymore.
- Cards link to `/@handle/pet/{id}?via=foster-me` (see 5b-events-rollup). Navigation is client-side, so first-touch link attribution carries over too.
- `selectFosterMePet` gains a `selectActiveFosters` sibling returning all active pets (sorted newest first), with unit tests.
- Owner viewing their own foster-me sees the same preview, with no capture, plus a small "Manage links" button.
- Update `FosterMePage.test.tsx`, `selectFosterMePet.test.ts`, and the foster-me E2E.

**Agent.** Main session (web) + test-expert.

**Prompt.**
> Rebuild `apps/web/client/pages/users/FosterMePage.tsx` as a preview page: XXXL circular avatar cards (cover photo, name, weight from `size`, age) linking to each pet's bio. Add `selectActiveFosters` next to `selectFosterMePet` (keep the existing fallback rule for zero active pets). One pet → large centered card with "Meet {name}"; several → responsive 1/2/3-column grid with "Meet the pets {displayName} is fostering." Cards link to `/@handle/pet/{id}?via=foster-me`. Fire `foster_me_viewed` on mount via the new capture helper and remove the `pet_viewed` capture from this page. Owner sees the preview without capture plus a "Manage links" button. Update the unit tests and foster-me E2E.

---

## 5b-links-page — Owner links page

**Description.** One owner-level links page at `/profile/links` replaces `/pets/[id]/links`. The stress test showed the old page overwhelms people on arrival, so creation moves into a modal with a built-in first-run tutorial.

**Acceptance criteria.**
- **Layout:** on `OwnerPageLayout` (hero = title + summary chart, no public preview section).
  - Hero: owner funnel tiles (preview views → pet taps → inquiries) for 30d with a small chart, using 5a chart primitives. All three ranges prefetched, as in 5a.
  - A "Create link" primary button.
  - Link list: default link pinned first, then others by created date. Each row: label, channel name, preview views / pet taps / inquiries, QR thumbnail, `QrDownloadMenu`, Copy link, Archive.
  - An "Untagged visits" row under the default link: people who opened the plain foster-me URL (typed, shared, or old printed signs). Same three stats, no QR or actions.
  - Archived links collapse into a section at the bottom.
  - **Legacy pet links:** if any `target = 'pet'` links exist, a collapsed "Older pet-specific links" section, read-only except Archive, with a one-line note that they still work.
  - The "Original QR" row is removed. Untagged URLs still count as Direct in analytics.
- **Empty state (no foster-me links):** short explainer copy. The Create link button pulses (CSS animation, respects `prefers-reduced-motion`).
- **Create modal (`Dialog`), first-run mode** (owner has zero non-archived foster-me links):
  - A "Create first link" option rendered first, ahead of the channel chips.
  - Every other control (channel chips, custom input, label) is visibly disabled.
  - Clicking it calls `POST /me/links { isDefault: true }` in the background, closes the modal, and opens an intro dialog:
    1. "This is your default link to the pets you foster."
    2. "Create *tracked links* to see how adopters find you — one for your lawn sign, one for Instagram, and so on."
    With a Next / Got it stepper. The new default link is in the list when the dialog closes.
- **Create modal, normal mode:**
  - Preset channel chips from `GET /me/channels` (no `default`).
  - The custom channel text input is always visible, never behind an "Add custom channel" toggle, with helper text: "Something else? e.g. Vet office, Shelter listing, Dog park board."
  - Optional label.
  - Create → `POST /me/links`; the new row highlights briefly.
- Copy link and QR encode `/@handle/foster-me?s={code}`.
- Vitest: first-run gating, background create + dialog sequence, pulse only when empty, custom input always visible. Playwright: first-run flow end to end, then create an Instagram link.

**Agent.** Main session (web) + test-expert.

**Prompt.**
> Build `apps/web/app/profile/links/page.tsx` + `client/pages/links/` on `OwnerPageLayout`. Hero: owner funnel from `GET /me/links/analytics` (prefetch all three ranges with `useQueries`) using the 5a chart primitives. Body: links from `GET /me/links`, with the default link pinned, `QrDownloadMenu` per row, archived and legacy pet-link sections collapsed (legacy read-only except Archive), and no "Original QR" row. Create via a `Dialog`: in first-run mode (no non-archived foster_me links) show a "Create first link" option first and disable everything else; clicking it posts `{ isDefault: true }`, closes the modal, and opens a two-step intro dialog. In normal mode show preset chips, an always-visible custom channel input with the helper text from the ticket, and an optional label. Pulse the Create button when the list is empty (honor reduced motion). URLs are `/@handle/foster-me?s={code}`. Vitest + one Playwright flow.

---

## 5b-rewire — Entry points and cleanup

**Description.** Point everything at the new model and retire what it replaces.

**Acceptance criteria.**
- Every links entry point goes to `/profile/links`: the owner pet bio hero (5a), the owner analytics widget, **and the per-pet analytics page** (`AnalyticsView`'s "Manage links").
- **Wording:** `/profile/links` now holds the foster-me analytics, so entry points say "Links & analytics", not "Manage links". The foster-me preview's owner button keeps "Manage links" (it is about the links themselves).
- `/profile` hero (5a): add a "Links & QR codes" button.
- **Header:** add "Links & QR codes" to the account menu and the mobile menu, next to Profile.
- **Per-pet analytics → foster-me funnel:** when any of the pet's views came via foster-me links, show a one-line link to `/profile/links` ("See your full foster-me funnel") beside the "via foster-me" rows.
- Per-pet analytics links table: name rows using `GET /me/links` (all targets), so foster-me links that sent traffic to this pet show their label with a small "via foster-me" tag. No orphan or blank rows.
- Remove the per-pet links route (`/@handle/pet/{id}/links`) and its CloudFront rewrite outright, with no redirect: there are no active users yet, so there are no old bookmarks to catch.
- Remove `GET /pets/:id/analytics/summary` and `GetPetAnalyticsSummaryUseCase` (unused since 5a-owner-widget).
- Delete the now-dead `LinksManager.tsx`, `PetLinksPage.tsx`, and `ShareLinkCard` pieces that only served the old page, after confirming no imports remain.
- `npm run ci` green; the full Playwright suite passes.

**Agent.** Main session (web) + code-janitor + test-expert.

**Prompt.**
> Rewire all "Manage links" entry points (pet bio hero, owner analytics widget, per-pet `AnalyticsView`) to `/profile/links` and rename them "Links & analytics". Add a "Links & QR codes" button to the `/profile` hero and a "Links & QR codes" item to the header's account and mobile menus. In per-pet analytics, link to the foster-me funnel on `/profile/links` when any traffic came via foster-me links. In per-pet analytics, resolve link names from `GET /me/links` so foster-me links render with a "via foster-me" tag. Delete the old `/@handle/pet/{id}/links` route and its CloudFront rewrite (no redirect; no users yet). Remove the pet analytics summary endpoint and use case, and delete `LinksManager`, `PetLinksPage`, and any other components only the old page used, after verifying with a repo-wide search. Run the full CI and Playwright suites.

---

## Done when

- All acceptance criteria pass, `npm run ci` and Playwright are green, todo.md §8 is ticked.
- Manual check: a fresh account sees a pulsing Create button, completes the first-link tutorial, scans the default link's QR, lands on the preview, taps a pet, submits an inquiry. That inquiry shows up attributed to the default link in the inbox source chip, on `/profile/links`, and in the pet's analytics. Then repeat from the plain foster-me URL (no `?s=`): the tap and inquiry must appear in the "Untagged visits" row, not vanish into Direct.
- An existing pet-target link from before the migration still resolves to its pet and still attributes.

## Lattice harvest notes

- `target` + `entityMarks` are the generic seams: "a link resolves to an entity or to an owner-level landing page," and "this entity was reached from a hub page." Keep the words "foster" and "pet" out of `packages/analytics`.
- The links page and modal are app-specific for now. Extracting them is a post-release decision, not part of this slice.
