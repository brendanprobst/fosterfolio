# Fosterfolio v2 — PR #22 Review

**PR:** [#22](https://github.com/brendanprobst/fosterfolio/pull/22) · branch `v2/advanced-link-management` → `main` · head `b27d7ca`
**Size:** 334 files, +23,971 / −2,045, 44 commits
**Reviewed against:** [`fosterfolio-v2-spec.md`](./fosterfolio-v2-spec.md), plus [`v2_slice5b_foster_me_links.plan.md`](./v2_slice5b_foster_me_links.plan.md) where it intentionally changes the spec
**Method:** I read the diff locally by area (infra, migrations, API, packages, web). One throwaway Jest probe confirmed L1, and I pulled the PR's CI logs. I did not run the full suite locally.

---

## TL;DR — fix before merge

1. **L1 (Critical):** The main v2 flow is broken. A visitor who comes in through a tracked foster-me link, taps a pet, and submits an inquiry gets a **400** ("Please provide a name, email, and message."). The probe test confirmed it.
2. **CI is red.** Web unit tests fail in `SearchPage.test.tsx` (the `next/navigation` mock has no `usePathname`). E2E fails because `@lattice/notifications/dist` doesn't exist when the API dev server starts.
3. **S1 / S2 (High):** In production, Turnstile, the inquiry source-token secret, SES email and `WEB_ORIGIN` are never wired. Turnstile and the token check **fail open**, and the token falls back to an HMAC secret that's committed in the repo.
4. **S3 (High):** The rollup trusts PostHog event properties, and anyone holding the public project token can write those. One bad event aborts the hourly job for 14 days. Forged events can inflate any pet's or owner's numbers. The values also go unencoded into service-role PostgREST filters.
5. **L2 (High):** If an owner refreshes their own pet page, the visit is recorded as a view. Capture fires before auth has resolved.

---

## Summary table

| ID | Sev | Area | Item |
|---|---|---|---|
| L1 | Critical | Logic | Foster-me link + pet inquiry is rejected with 400 |
| CI | Critical | CI | Web unit + E2E jobs failing on the PR head |
| S1 | High | Security/Infra | Turnstile fails open in prod; no rate limiting on public endpoints |
| S2 | High | Security | Source-token HMAC falls back to a hardcoded, committed secret |
| S3 | High | Security/Logic | Rollup trusts client-writable PostHog properties (poison pill, forgery, filter injection) |
| L2 | High | Logic | Owner self-views are captured before auth resolves |
| S4 | Medium | Security/Infra | PostHog personal API key in a plaintext Lambda env var and TF state |
| S5 | Medium | Security | `mailto:` injection through sender email |
| L3 | Medium | Logic | Custom channel names collide with system keys (`direct`, `search`); picker shows duplicates |
| L4 | Medium | Logic | "Adopted freeze" is client-only; the rollup keeps rewriting numbers |
| L5 | Medium | Logic/Perf | Rollup upsert: one row per request, silent truncation, partial writes |
| L6 | Medium | Logic/UX | Turnstile client: submit does nothing silently; token not reset for retry |
| S6 | Low | Infra | Rollup shares the API IAM role; no alarm; deployed with empty creds it fails every hour |
| S7 | Low | Infra/Hygiene | Lambda zip build artifacts committed to git |
| S8 | Low | Security | Missing input bounds (label, channel name, cursor), unvalidated client `sourceChannelKey` |
| L7 | Low | Logic | Metric semantics: conversion can exceed 100%; "approx visitors" is meaningless and hidden; UTC days |
| L8 | Low | Perf/Data | Inbox does N+1 lookups; notification payload duplicates PII it then overwrites |
| Q1 | Medium | DRY | Two near-identical rollup repositories; the coalesced key is defined 3 times |
| Q2 | Medium | Structure | Two workspace packages built two different ways; 4 places to keep aliases in sync |
| Q3 | Medium | Structure | `@lattice/analytics` isn't app-agnostic (pet-shaped rows, hardcoded referrer map) |
| Q4 | Low | DRY | Link-code generation loop duplicated; self-reported source list duplicated API↔web |
| Q5 | Low | Dead code | Pet-target link endpoints, `approx_visitors`, `analytics_stopped_at` are unused |
| Q6 | Low | Structure | Migration symlinks + master snapshots duplicate about 2.3k lines of SQL |
| Q7 | Low | Perf | Owner widget makes 3 requests where one summary would do |
| Q8 | Low | Hygiene | PR is too large to review and the description is empty |
| SPEC | — | Spec | Conformance, deviations, misses, scope creep (section 4) |

---

## 1. Security and infrastructure

### S1 — Turnstile fails open in production, and public endpoints have no rate limit · High

**Where:** `apps/api/application/use-cases/CreateInquiryUseCase.ts:81`, `apps/api/infrastructure/composition/inquiries.ts:57`, `infra/terraform/envs/*/main.tf` (API Lambda `environment` block)

**What:** Turnstile is checked only when `TURNSTILE_SECRET_KEY` is set. Terraform never sets it on the API Lambda, and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` isn't part of the deploy either. In production, `POST /inquiries` accepts anything without a token. `POST /inquiries`, `PATCH /inquiries/:id/self-reported-source` and `GET /links/resolve/:code` have no rate limiting.

**Why it matters:** The spec relies on Turnstile as the inbox/email spam control ("Inquiry spam: blocked by Turnstile"). Without it, anyone can script floods into an owner's inbox. Once SES is turned on, that becomes an email relay to every registered foster parent, with attacker-controlled body and Reply-To.

**Fix:**
- Store `TURNSTILE_SECRET_KEY` in SSM, the same way the Supabase keys are stored, and pass the site key into the web build.
- **Fail closed** when `NODE_ENV=production` and the secret is missing, instead of skipping the check.
- Add an API Gateway throttle, or a per-IP limit, on the three public routes.

### S2 — Source-token HMAC falls back to a hardcoded secret · High

**Where:** `apps/api/application/inquiries/inquirySourceToken.ts:8`

**What:** `INQUIRY_SOURCE_TOKEN_SECRET` falls back to `'fosterfolio-dev-inquiry-source-token'`, and Terraform never sets the real value. Production tokens can be forged by anyone who has read the repo.

**Why it matters:** The direct impact is small today. An attacker still needs the inquiry UUID, gets one write within 30 minutes, and can only pick from a fixed list of values. The pattern is the real problem: a security control that silently downgrades in production. It will be copied.

**Fix:** Throw at startup when the secret is missing in production. Store it in SSM. Do the same for any future signing secret.

### S3 — The rollup trusts client-writable PostHog properties · High

**Where:** `packages/analytics/src/aggregates.ts:56`, `apps/api/infrastructure/repositories/AnalyticsDailyRepository.ts:68` and its `patch()`, and the same code in `AnalyticsOwnerDailyRepository.ts`

**What:** The PostHog project token is public, because it ships in the browser bundle. Anyone can send `pet_viewed` or `foster_me_viewed` events with any `pet_id`, `owner_id`, `link_id` or `channel_key`. The rollup writes those values straight into Supabase with the service role:

- **Poison pill:** `normalizeAggregateRow` *throws* on any row missing `pet_id` or `channel_key`. A non-UUID `pet_id` also fails the insert, and `isUniqueViolation` doesn't treat that as recoverable. One bad event aborts the whole run. The query covers a 14-day window, so the job stays broken for 14 days. Rows already written before the failure stay written.
- **Forgery:** Fake views, cities, channels and link ids can be written to any pet or owner. `byLink` will show link ids that belong to nobody, or to another owner.
- **Filter injection:** `pet_id=in.(${petIds.join(',')})`, `pet_id=eq.${row.petId}` and `link_id=eq.${row.linkId}` are interpolated without encoding into PostgREST URLs that run as the service role. The extra filters are AND-ed, so I couldn't find a way to widen a write. It's still untrusted input feeding a privileged query builder.

**Fix:**
- Validate UUIDs, then drop any row whose `pet_id` doesn't exist, or whose `link_id` doesn't belong to that pet's owner. Do this with a single lookup per run.
- Skip and log bad rows instead of throwing.
- `encodeURIComponent` every filter value.
- Limit `channel_key` to presets, the owner's custom keys, and the referrer keys (`direct`, `search`, …).

### S4 — PostHog personal API key stored in a plaintext env var · Medium

**Where:** `infra/terraform/envs/{dev,prod}/main.tf:141`, `variables.tf` (`posthog_personal_api_key`)

**What:** The key is passed straight in as a Lambda environment variable. That makes it visible to anyone with `lambda:GetFunctionConfiguration`, and it is also stored in Terraform state. PostHog personal keys belong to a *user*, so the key may reach every project and org that user can see.

**Fix:** Store it as an SSM SecureString and load it with `loadSupabaseEnvFromSsm` (generalize that helper). Create a **project-scoped key with `query:read` only**.

### S5 — `mailto:` injection through sender email · Medium

**Where:** `apps/api/application/use-cases/CreateInquiryUseCase.ts:37` (`EMAIL_RE`), `apps/web/client/pages/inbox/InboxView.tsx:149,161`

**What:** `EMAIL_RE` (`^[^\s@]+@[^\s@]+\.[^\s@]+$`) accepts `a@b.co?bcc=evil%40x.com&body=…`. The inbox puts the raw value into `href={\`mailto:${email}?subject=…\`}`. When the owner clicks **Reply by email**, the draft gets a hidden BCC or a pre-filled body. The same value is used as SES `ReplyToAddresses`, which SES rejects, so the notification email quietly fails too.

**Fix:** Use a stricter address check that rejects `?`, `&`, `%`, `,` and `;`. Also `encodeURIComponent` the address in the `mailto:`.

### S6 — Rollup Lambda operations · Low

**Where:** `infra/terraform/envs/*/main.tf:123–167`

- The rollup reuses `aws_iam_role.api_lambda`. Today that role can only read SSM. When SES permissions are added for S1/email, the rollup will get them too. Give it its own role.
- There's no CloudWatch alarm on `Errors` and no DLQ. Combined with S3, the job can fail silently for weeks.
- `deploy-aws.mjs` warns when the PostHog creds are missing, then deploys anyway. The Lambda then throws `Missing required environment variable` 24 times a day. Use `count = var.posthog_project_id == "" ? 0 : 1` instead.

### S7 — Lambda zip artifacts committed · Low

**Where:** `infra/terraform/envs/dev/.generated/analytics-rollup-lambda.zip` (new) and `.generated/api-lambda.zip` (dev and prod, both tracked)

**What:** About 1.5 MB of bundled API code goes into git history on every deploy. `archive_file` regenerates these files anyway. I grepped the rollup bundle and found no embedded keys, but the full bundled API code is still in history.

**Fix:** Add `**/.generated/` to `.gitignore` and run `git rm --cached`.

### S8 — Input bounds · Low

- `label` and custom `channelName` have no length limit in the API or the DB. Express's default 100 KB body means 100 KB channel names can end up in everyone's picker. Add a `check (char_length(...) <= N)` and validate in the use cases.
- When no link id is sent, the client's `sourceChannelKey` is stored as-is (up to 64 characters), so arbitrary keys show up in `byChannel`.
- The notification cursor (`decodeNotificationCursor`) only checks that the fields are strings before they go into a PostgREST `or=(…)`. `encodeURIComponent` doesn't protect PostgREST grammar, because PostgREST parses after URL-decoding. The `recipient_id` AND keeps this safe today. Validate them as ISO timestamp and UUID.
- `GET /links/resolve/:code` returns `ownerId` and `petId`, including for soft-deleted pets. Only `linkId`, `channelKey` and `target` are needed for attribution.

---

## 2. Logic gaps and business edge cases

### L1 — Inquiries from foster-me links are rejected · Critical (verified)

**Where:** `apps/api/application/use-cases/CreateInquiryUseCase.ts:110`, `apps/web/client/features/inquiries/InquiryForm.tsx:252–263`

**What:** Foster-me links have `pet_id = null`, and resolve returns `petId: null`. In `InquiryForm`, `linkMatches` is `!source?.targetId || …`, which is `true`, so the form sends `sourceLinkId` along with `targetPetId`. The server then rejects it with `link.petId !== targetPetId`, because `null !== '<pet uuid>'`.

**Repro (probe test, since deleted):** Create a link with `POST /me/links`, create a pet, then `POST /inquiries` with `{ targetPetId, sourceLinkId, viaFosterMe: true }`. The response is `400 INQUIRY_INVALID_INPUT` with "Please provide a name, email, and message."

**Why it matters:** This is the flow 5b was built around: lawn sign → `foster-me?s=code` → tap a pet → inquire. Every attributed inquiry fails, and the error message points the visitor at the wrong fields. Nothing in the suite covers this combination.

**Fix:** In the use case, accept a `foster_me` link when `link.ownerId === target.id`, and keep the `petId` check for `pet` links. Add a regression test. Separately, return a distinct error code or message for an invalid source, or drop a bad `sourceLinkId` and still accept the inquiry. Attribution should never block contact.

### L2 — Owner self-views captured on refresh · High

**Where:** `apps/web/client/pages/pets/PetBioPage.tsx:35–39` (and `FosterMePage.tsx:59–67`)

**What:** `capturePetEvents` is `pet && !isOwner && !adopted`, and it doesn't wait for `authLoading`. On a hard refresh, the pet query often resolves before Supabase restores the session. `user` is still null at that point, so `pet_viewed` fires. The `seen` ref then blocks the correction. Owners refresh their own pages more than anyone, so their own views inflate their numbers.

`syncPetCaptureSuppression` is also called during render. That's a side effect in render, and it mutates module-global state that every route shares.

**Fix:** Gate capture on `!authLoading`, using the existing viewer hint for the no-session case. Move suppression into a `useEffect`, or pass it explicitly to `capturePetEvent` rather than relying on global module state.

### L3 — Channel key collisions and picker duplicates · Medium

**Where:** `apps/api/domain/channels/channelPresets.ts:26`, `apps/api/application/use-cases/ListChannelsUseCase.ts:28`

- A custom channel named **"Direct"** gets the slug `direct` and merges with untagged and v1-QR traffic, which the UI labels "Direct / original QR". A channel named **"Search"** merges with Google referrals. Only `default` is reserved. Reserve every system key the referrer map can produce.
- `slugify` only lowercases and turns spaces into hyphens. "Vet Office!", "vet office" and "vet  office " don't all group together. Strip punctuation and collapse repeated hyphens.
- `ListChannels` dedupes on `key + name`. "Vet Office" and "vet office" share a key, so they show up as **two** picker entries with the same key, which can also collide as React keys. Dedupe on key and keep the most recent name.
- `search` and `default` have no display name, so the UI shows the raw key.

### L4 — "Adopted freeze" is client-only · Medium

**Where:** `apps/api/application/analytics/fosterfolioDailyQuery.ts:8`, `apps/api/domain/entities/Pet.ts:183–188`

**What:** The spec says the rollup "keeps the final numbers." Instead, it re-aggregates the last 14 days every hour and overwrites them. It also ignores `analytics_stopped_at`. Events from cached tabs, slow clients, or forged sources (S3) after adoption still move the "Final results." The column is written but never read. Pets that were already adopted before the migration have `analytics_stopped_at = null`.

**Fix:** Filter rollup rows where `day > analytics_stopped_at` with a join or lookup. Backfill `analytics_stopped_at = updated_at` for pets already marked adopted.

### L5 — Rollup upsert scalability and atomicity · Medium

**Where:** `AnalyticsDailyRepository.upsert` (`:72`), `AnalyticsOwnerDailyRepository.upsert` (`:119`)

**What:**
- Every row costs one HTTP insert or patch, and the timeout is 60 s.
- `pet_id=in.(…)` grows with the number of active pets until it hits URL-length limits.
- `limit=10000` on the "existing" read and in `sumViewsByLinkIds` silently truncates. Unique-violation fallback hides it for writes, but link **totals** come back wrong.
- A failure partway through leaves a half-written day.

**Fix:** Replace the expression index with `unique nulls not distinct (pet_id, link_id, channel_key, city, day)` (Postgres 15+, which Supabase has). Then a single bulk `POST …?on_conflict=…` with `resolution=merge-duplicates` does the whole upsert. Or write one SQL RPC that upserts a JSON array in a single transaction. Do the per-link totals in SQL with `group by`.

### L6 — Turnstile client behavior · Medium

**Where:** `apps/web/client/features/inquiries/InquiryForm.tsx:239`, `InvisibleTurnstile`

- If the Turnstile script hasn't loaded yet, or is blocked by an ad blocker or privacy extension, `if (!turnstileRef.current) return;` makes **Submit do nothing**, with no error and no spinner.
- Turnstile tokens are single-use. After a server error, `execute()` runs again on an already-solved widget without `turnstile.reset(widgetId)`, so retries can hang or fail.
- No timeout on the `siteverify` call, so a slow Cloudflare response blocks the request until the Lambda times out.

**Fix:** Show an error state when the widget isn't ready, call `reset` before every `execute`, and add an `AbortController` timeout on the server fetch.

### L7 — Metric semantics · Low

- **Conversion can exceed 100%.** Inquiries come from Supabase (complete). Views come from PostHog, which ad blockers undercount. With small numbers, 2 inquiries ÷ 1 view = 200%. Cap it, or mark it "≈".
- **`approx_visitors` is effectively equal to `views`.** With `persistence: 'memory'`, every full page load gets a new `person_id`. The rollup then *sums* `uniq` across city/link/day rows, which overcounts further. The UI never shows it, so the spec's "approx. visitors" label is missing. Either drop the column or define it honestly.
- Inquiries with a null `source_channel_key` (v1 rows, failed attribution) count toward the funnel total but not `byChannel`, so the channel bars don't add up to the stat card.
- All day buckets are UTC. A US-Pacific owner's "today" changes over at 5 pm.

### L8 — Inbox N+1 and duplicated PII · Low

**Where:** `apps/api/application/use-cases/ListNotificationsUseCase.ts:82`

**What:** Each notification triggers up to three sequential lookups: inquiry, then link, then pet. A page of 20 can mean about 60 Supabase round trips from Lambda. The stored `payload` snapshot (sender email, message, zip) is overwritten by the live inquiry anyway. That leaves a second copy of PII that won't follow deletes or edits of the inquiry.

**Fix:** Batch with `id=in.(…)` per entity type. Store only `{ petId }` and the entity ref in the payload, and hydrate everything else at read time.

### Also worth a look

- The server doesn't check that `self_reported_source` is only set for inquiries whose source was `direct`. The client decides.
- `UpdateNotificationUseCase` calls `findForRecipient`, then `markRead` calls it again: two reads per PATCH.
- `CreateTrackedLink`'s code-collision check is check-then-insert. A race on the unique index returns 500 instead of retrying. That's rare at 62⁸ codes, but the retry loop is right there.

---

## 3. Code quality, DRY, structure

### Q1 — Duplicated rollup repositories and keys · Medium

`AnalyticsDailyRepository` and `AnalyticsOwnerDailyRepository` share the same upsert algorithm, `postgrestEq` and `isUniqueViolation`. The only differences are the table and the key columns. The coalesced key is written three times (`analyticsDailyKey`, `analyticsOwnerDailyKey`, `@lattice/analytics` `aggregateKey`), and `NULL_LINK_ID` is defined twice. If L5's bulk upsert lands, most of this goes away. If not, pull out one generic `RollupTableRepository<TRow>` parameterized by table and key columns.

### Q2 — Two packages, two build models · Medium

- `@lattice/analytics` is ESM and exports **TS source** (`"build": "tsc --noEmit"`).
- `@lattice/notifications` is CJS and exports a **compiled `dist/`**.

To make that work, consumers need aliases in four places: the root `tsconfig.json`, `apps/api/tsconfig.rollup.json`, `apps/web/tsconfig.json` and Jest's `moduleNameMapper`. `analyticsRollup.ts` is excluded from the API tsconfig and type-checked separately. This is the **direct cause of the E2E failure** (`Cannot find module …/@lattice/notifications/dist/index.js`). `deploy-aws.mjs` also runs `build:lambda` without building the packages first, so it can bundle a stale `dist/`.

**Fix:** Pick one model. For an internal monorepo, source-exported TS with `exports` for both packages is simplest. Then add one `paths` entry per package in a shared base tsconfig.

### Q3 — `@lattice/analytics` isn't app-agnostic · Medium

The spec says the package "knows nothing about pets." Instead:
- `AggregateRow` has `pet_id` and `form_opens`, and `PostHogProvider` has a hardcoded `COLUMNS` list.
- The referrer→channel map is hardcoded in `referrer.ts`. The spec says it's configurable.
- The owner rollup goes around `runRollup` through `queryRecords` plus a hand-written `mapOwnerDailyRow`, which duplicates `normalizeAggregateRow`'s `text`/`count` helpers.
- `rowsFromQueryResponse` and `recordsFromQueryResponse` are near-duplicates.

**Fix:** Make `runRollup` generic, `runRollup<T>({ provider, query, map: (record) => T | null, upsert })`. Keep only `queryRecords` on the provider, and take the referrer map from `AnalyticsConfig`. That also makes the "skip bad rows" fix from S3 natural.

### Q4 — Small duplications · Low

- The code-generation retry loop is copy-pasted between `CreateTrackedLinkUseCase` and `CreateOwnerLinkUseCase`. Move it into `ITrackedLinkRepository.createWithUniqueCode` or a domain helper.
- The self-reported source list lives in both `apps/api/application/inquiries/selfReportedSources.ts` and `apps/web/.../InquiryForm.tsx` (`SELF_REPORTED_SOURCE_OPTIONS`). For channels, the spec makes the API the single source of truth. Apply the same rule here, or at least share a constant.
- The dev and prod `main.tf` are byte-identical, including the new rollup block. That pattern predates this PR, but each new resource doubles it. Consider a module.

### Q5 — Dead or write-only code · Low

- `POST/GET /pets/:id/links` are kept on purpose with no UI caller, and they still need tests and Swagger. Fine if pet flyers are really expected. Otherwise remove them, since the backend still supports both targets.
- `approx_visitors` is written but never displayed (see L7).
- `analytics_stopped_at` is written but never read (see L4).

### Q6 — Migration layout · Low

The PR turns `supabase/migrations/*.sql` into **symlinks** into `feature-migrations/`, and adds `master-migration/LATEST_*.sql` plus `archive/` snapshots. That's about 2.3k lines of duplicated SQL, kept in sync by `sync-feature-migrations.mjs`.

- Symlinks are fragile on Windows, in some CI checkouts, and in some editors.
- Every schema change now has three places to drift.
- I diffed the v1 migration against `main` and it is byte-identical, so applied history is safe.

Consider whether the snapshot is worth the cost, compared with `supabase db dump` on demand.

### Q7 — Owner widget fetch pattern · Low

`OwnerAnalyticsWidget` fetches `30d` analytics, then `7d` analytics (which is a slice of the 30d data), then `/me/channels` only to get display names. 5b retired the `/summary` endpoint. Either derive 7d from the 30d data on the client, or bring back a compact summary that includes channel names.

### Q8 — PR size and hygiene · Low

334 files and 44 commits make this hard to review. The PR mixes v2 features, a markdown editor, post composer changes, profile layout work, Cursor skills, a migration restructure and plan docs. The PR body is the empty template with unchecked boxes. For the remaining work, split per slice: infra, schema + API, web.

---

## 4. Spec conformance

### Delivered as specified ✅

- `tracked_links`, `analytics_daily`, `notifications`, `notification_preferences` schema with select-only owner RLS. Service role writes.
- Short random codes (8 chars, `crypto.randomBytes`), archive-never-delete, archived links still resolve.
- First-touch attribution in `sessionStorage` `ff_source`: code → referrer → direct, never overwritten.
- PostHog cookieless (`persistence: 'memory'`, no autocapture/pageview/recording), with the ad-blocker note in code and README.
- Events `pet_viewed`, `inquiry_form_opened`, `inquiry_submitted`. Capture is skipped for adopted pets (but see L2 for owners).
- Hourly EventBridge → Lambda rollup. The dashboard reads Supabase only and joins inquiries live.
- Inquiry zip, hidden source fields, Turnstile widget, success-screen "How did you hear about [Pet]?" shown only for `direct`, one-time token, 30-minute window.
- Generic `dispatch` with in-app row → preference check → email. Single `inquiry_received` type. `emailed_at`. Unsubscribe follow-up noted in the README.
- Inbox: Unread/All/Archived, mailto reply, "No longer available" pet chip, unread badge polled on focus and route change, settings toggle.
- Per-pet analytics page with stat cards, channel chart, per-link table, top cities and trend, plus the "Final results" adopted banner.

### Deliberate deviations (5b pivot) — update the spec ⚠️

These are documented in `v2_slice5b_foster_me_links.plan.md` but **not reflected in the spec**, which still says "Open Questions: None":
- Links are now **owner-level foster-me links** (`tracked_links.target`, nullable `pet_id`). The page is `/profile/links`, not `/pets/[id]/links`.
- New `analytics_owner_daily` table, `foster_me_viewed` event, `via_foster_me` marker on events and inquiries, and `GET/POST /me/links` plus `GET /me/links/analytics`.
- `GET /pets/:id/analytics/summary` was retired.
- A "Default link" with a first-link tutorial replaces the "Original QR" row.

These look like the right product call. Update the spec so it is the source of truth again, and add L1's flow to its edge-case list.

### Missed or incomplete ❌

| Spec item | Status |
|---|---|
| Presets: Lawn sign, Instagram, Facebook, TikTok, Flyer, **Shelter listing, Other** | The last two were removed in `1f373e1`. Self-report still offers "Other" and "Shelter". |
| "Email for every inquiry notification via SES" | Code is done. **Not live:** `EMAIL_PROVIDER`, `EMAIL_FROM`, `ses:SendEmail` IAM and `WEB_ORIGIN` are not wired in Terraform. The footer link is relative (`/settings/notifications`) in production. |
| Turnstile spam protection | Code is done. **Not live** (S1). |
| "Rollup job keeps the final numbers" on adoption | Not implemented (L4) |
| "approx. visitors" label | Not shown anywhere (L7) |
| "Original QR" row explaining Direct traffic | Gone. v1 signs that point at pet URLs now appear only as "Direct / original QR" in charts, and nothing on the links page explains them. |
| `packages/analytics` knows nothing about pets; configurable referrer map | Not met (Q3) |
| Packages "liftable into Lattice" | Inconsistent build models (Q2) make lifting harder |
| PostHog setting: confirm GeoIP still runs with "Discard client IP" | No doc or checklist entry found. Add it to `docs/deploy-aws.md` or the package README. |
| Owner self-views excluded | Partially (L2) |

### Scope creep (not in the v2 spec)

None of this is necessarily bad, but it widens the review and the risk:

- **5b foster-me product pivot** (above). It's the biggest addition, at roughly the size of the original analytics slice.
- **Markdown editor** (`MarkdownEditor`, `remarkUnderline`, `markdownExtensions`), **PostComposer** replacing `FeedComposer`, **PhotoOpener / PhotoDropzone**.
- **Profile and pet page redesign:** `OwnerPageLayout`, `OwnerPetHero`, `PetFacts`, `InquiryCta` floating button, `DataPageSkeleton`, `viewerHint`, `PetInquiries` per-pet inbox view.
- **Charts:** shadcn `chart.tsx` (372 lines), `Sparkline`, week-over-week copy, UI gallery entries.
- **Tooling:** Cursor skills (`explain-diff`, `stage-chunk`, `sql-schema`), separate `.next-dev` / `.next-e2e` dirs, the Supabase migration restructure plus master seed (Q6), and the `SUPABASE_PUSH_ENABLED` arm switch.
- About 3,000 lines of plan docs under `docs/plans/`.

---

## 5. CI status (PR head `b27d7ca`)

| Job | Result | Cause |
|---|---|---|
| `test (22.x)` | ❌ | `test/web/unit/SearchPage.test.tsx` (3 tests): `No "usePathname" export is defined on the "next/navigation" mock`. `AppHeader` now calls `useUnreadNotificationCount`, which uses `usePathname`. Add it to that test's mock, or to a shared mock in `vitest.setup.ts`. |
| `web-e2e` | ❌ | `Cannot find module …/node_modules/@lattice/notifications/dist/index.js`. The API dev server can't start because the package was never built (Q2). |
| `terraform` | skipped | — |

---

## 6. Suggested order before merge

1. **L1**: Fix the foster-me inquiry check and add a regression test.
2. **CI**: Fix the `usePathname` mock and the notifications package resolution (Q2).
3. **S1 / S2**: Wire `TURNSTILE_SECRET_KEY`, `INQUIRY_SOURCE_TOKEN_SECRET`, SES and `WEB_ORIGIN` through SSM, and fail closed in production.
4. **S3**: Validate and skip rollup rows, encode filter values, add an alarm (S6).
5. **L2**: Gate capture on auth having resolved.
6. **S5, L3**: Harden email validation and reserve system channel keys.
7. Update `fosterfolio-v2-spec.md` to reflect 5b, then file L4–L8 and Q1–Q7 as follow-ups.
