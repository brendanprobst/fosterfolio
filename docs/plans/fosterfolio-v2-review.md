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

| ID   | Sev      | Area           | Item                                                                                                  | Status                                 |
| ---- | -------- | -------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------- |
| L1   | Critical | Logic          | Foster-me link + pet inquiry is rejected with 400                                                     | ✅ Fixed                               |
| CI   | Critical | CI             | Web unit + E2E jobs failing on the PR head                                                            | ✅ Fixed                               |
| S1   | High     | Security/Infra | Turnstile fails open in prod; no rate limiting on public endpoints                                    | ✅ Fixed (route-level, not per-IP)     |
| S2   | High     | Security       | Source-token HMAC falls back to a hardcoded, committed secret                                         | ✅ Fixed (needs manual SSM setup)      |
| S3   | High     | Security/Logic | Rollup trusts client-writable PostHog properties (poison pill, forgery, filter injection)             | ✅ Fixed                               |
| L2   | High     | Logic          | Owner self-views are captured before auth resolves                                                    | ✅ Fixed                               |
| S4   | Medium   | Security/Infra | PostHog personal API key in a plaintext Lambda env var and TF state                                   | Open                                   |
| S5   | Medium   | Security       | `mailto:` injection through sender email                                                              | Open                                   |
| L3   | Medium   | Logic          | Custom channel names collide with system keys (`direct`, `search`); picker shows duplicates           | Open                                   |
| L4   | Medium   | Logic          | "Adopted freeze" is client-only; the rollup keeps rewriting numbers                                   | Open                                   |
| L5   | Medium   | Logic/Perf     | Rollup upsert: one row per request, silent truncation, partial writes                                 | Open                                   |
| L6   | Medium   | Logic/UX       | Turnstile client: submit does nothing silently; token not reset for retry                             | Open                                   |
| S6   | Low      | Infra          | Rollup shares the API IAM role; no alarm; deployed with empty creds it fails every hour               | Open                                   |
| S7   | Low      | Infra/Hygiene  | Lambda zip build artifacts committed to git                                                           | Open                                   |
| S8   | Low      | Security       | Missing input bounds (label, channel name, cursor), unvalidated client `sourceChannelKey`             | Open                                   |
| C1   | Medium   | Compliance     | No privacy policy; third-party processors (Turnstile, PostHog, Supabase, SES, Zippopotam) undisclosed | Open (blocks public launch, not merge) |
| L7   | Low      | Logic          | Metric semantics: conversion can exceed 100%; "approx visitors" is meaningless and hidden; UTC days   | Open                                   |
| L8   | Low      | Perf/Data      | Inbox does N+1 lookups; notification payload duplicates PII it then overwrites                        | Open                                   |
| Q1   | Medium   | DRY            | Two near-identical rollup repositories; the coalesced key is defined 3 times                          | Open                                   |
| Q2   | Medium   | Structure      | Two workspace packages built two different ways; 4 places to keep aliases in sync                     | Open                                   |
| Q3   | Medium   | Structure      | `@lattice/analytics` isn't app-agnostic (pet-shaped rows, hardcoded referrer map)                     | Open                                   |
| Q4   | Low      | DRY            | Link-code generation loop duplicated; self-reported source list duplicated API↔web                    | Open                                   |
| Q5   | Low      | Dead code      | Pet-target link endpoints, `approx_visitors`, `analytics_stopped_at` are unused                       | Open                                   |
| Q6   | Low      | Structure      | Migration symlinks + master snapshots duplicate about 2.3k lines of SQL                               | Open                                   |
| Q7   | Low      | Perf           | Owner widget makes 3 requests where one summary would do                                              | Open                                   |
| Q8   | Low      | Hygiene        | PR is too large to review and the description is empty                                                | Open                                   |
| SPEC | —        | Spec           | Conformance, deviations, misses, scope creep (section 4)                                              | —                                      |

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

**Status: ✅ Fixed** (2026-10-18, not yet committed; Turnstile needs the manual SSM setup, throttles need `terraform apply`)

- **Done: Turnstile fails closed in production.** `readInquirySecrets` (`apps/api/infrastructure/composition/inquiries.ts`) makes the API refuse to start when `NODE_ENV=production` and `TURNSTILE_SECRET_KEY` is missing. This is the same pattern as the Supabase check in `Container`. Turnstile is skipped only outside production.
- **Done: wiring.** The Lambda loads the secret from the SSM SecureString `/<project>-<env>/inquiries/turnstile_secret_key`. `loadEnvFromSsm` in `lambdaEnv.ts` now handles any `NAME` / `NAME_PARAM` pair. Terraform passes only the parameter name and grants `ssm:GetParameter`; the value is created by hand, so it never enters tfstate. Both deploy paths (`scripts/deploy-env.mjs`, `deploy-app.yml`) stop the web build when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is missing.
- **Docs:** setup and troubleshooting in `docs/deploy-aws.md` → "Inquiry secrets".
- **Correction to this finding:** the API Gateway stage already has a _global_ throttle (`api_gateway_throttling_rate_limit` = 10 rps, burst 20). The real gap is that the limit isn't per route or per IP, so one client can use the whole budget and lock everyone out.
- **Done: per-route throttles.** The three public routes are now their own API Gateway routes on the same Lambda, each throttled separately from the `ANY /{proxy+}` default. Defaults, set by the `api_gateway_public_route_throttles` variable (dev and prod): `POST /inquiries` and `PATCH /inquiries/{id}/self-reported-source` at 1 rps / burst 5, `GET /links/resolve/{code}` at 2 rps / burst 10. Every route has its own budget, so a flood on these three can't starve sign-in, the dashboard or the inbox. `terraform validate` passes in both envs. `terraform plan` on dev (`-refresh=false`) shows 3 routes to add and the stage updated in place, nothing destroyed. That plan also wanted to blank `POSTHOG_PERSONAL_API_KEY` on the rollup Lambda. That's only because it ran without Infisical, so the key fell back to its `""` default. A normal `infisical run -- npm run deploy:aws` passes the real key. Running `terraform apply` by hand without Infisical would empty the key and break the rollup (another reason to do S4).
- **Decision: no per-IP limit.** HTTP APIs (v2) can't throttle per client and don't support WAF. Per-IP limits would mean putting CloudFront + WAF in front of the API (about $6/month or more against the $10 budget) or adding a shared counter in Supabase. Turnstile already costs something per inquiry, and the other two routes are small or token-gated. The route caps are shared by everyone, so a flood can still lock real visitors out of *those* routes for as long as it lasts. If abuse shows up, revisit with WAF.
- **Known gaps:**
  - `POST /inquiries/` (trailing slash) doesn't match the route key. It goes to the proxy and gets the looser stage limit. Turnstile still gates it.
  - A throttled request gets API Gateway's 429 without Express's CORS headers, so the browser reports a network error and the form shows its generic failure message.
- **Still open (not part of this finding):** SES (`EMAIL_PROVIDER`, `EMAIL_FROM`, `ses:SendEmail` IAM) and `WEB_ORIGIN` on the Lambda, tracked in the section 4 "Missed" table; a `siteverify` timeout (L6).
- **Note for S6:** the analytics rollup shares `aws_iam_role.api_lambda`, so it can now read these two parameters as well.

### S2 — Source-token HMAC falls back to a hardcoded secret · High

**Where:** `apps/api/application/inquiries/inquirySourceToken.ts:8`

**What:** `INQUIRY_SOURCE_TOKEN_SECRET` falls back to `'fosterfolio-dev-inquiry-source-token'`, and Terraform never sets the real value. Production tokens can be forged by anyone who has read the repo.

**Why it matters:** The direct impact is small today. An attacker still needs the inquiry UUID, gets one write within 30 minutes, and can only pick from a fixed list of values. The pattern is the real problem: a security control that silently downgrades in production. It will be copied.

**Fix:** Throw at startup when the secret is missing in production. Store it in SSM. Do the same for any future signing secret.

**Status: ✅ Fixed** (2026-10-18, not yet committed; takes effect once the manual SSM setup in `docs/deploy-aws.md` is done)

- The committed fallback is gone. `inquirySourceToken.ts` takes the secret as a parameter and no longer reads `process.env`. Composition injects it into `CreateInquiryUseCase` and `ReportInquirySourceUseCase`.
- In production the API refuses to start when `INQUIRY_SOURCE_TOKEN_SECRET` is missing or shorter than 32 characters. Outside production each process gets a random key, so no signing key lives in the repo.
- The Lambda loads the key from the SSM SecureString `/<project>-<env>/inquiries/source_token_secret`. Terraform holds only the name.
- Tests: `test/api/inquirySecrets.test.ts` (fail-closed rules), `test/api/lambdaEnv.test.ts` (SSM loader), and a regression in `inquiries.test.ts`: a token forged with the old committed key is rejected. Setting the test key back to the old constant makes it fail.

### S3 — The rollup trusts client-writable PostHog properties · High

**Where:** `packages/analytics/src/aggregates.ts:56`, `apps/api/infrastructure/repositories/AnalyticsDailyRepository.ts:68` and its `patch()`, and the same code in `AnalyticsOwnerDailyRepository.ts`

**What:** The PostHog project token is public, because it ships in the browser bundle. Anyone can send `pet_viewed` or `foster_me_viewed` events with any `pet_id`, `owner_id`, `link_id` or `channel_key`. The rollup writes those values straight into Supabase with the service role:

- **Poison pill:** `normalizeAggregateRow` _throws_ on any row missing `pet_id` or `channel_key`. A non-UUID `pet_id` also fails the insert, and `isUniqueViolation` doesn't treat that as recoverable. One bad event aborts the whole run. The query covers a 14-day window, so the job stays broken for 14 days. Rows already written before the failure stay written.
- **Forgery:** Fake views, cities, channels and link ids can be written to any pet or owner. `byLink` will show link ids that belong to nobody, or to another owner.
- **Filter injection:** `pet_id=in.(${petIds.join(',')})`, `pet_id=eq.${row.petId}` and `link_id=eq.${row.linkId}` are interpolated without encoding into PostgREST URLs that run as the service role. The extra filters are AND-ed, so I couldn't find a way to widen a write. It's still untrusted input feeding a privileged query builder.

**Fix:**

- Validate UUIDs, then drop any row whose `pet_id` doesn't exist, or whose `link_id` doesn't belong to that pet's owner. Do this with a single lookup per run.
- Skip and log bad rows instead of throwing.
- `encodeURIComponent` every filter value.
- Limit `channel_key` to presets, the owner's custom keys, and the referrer keys (`direct`, `search`, …).

**Status: ✅ Fixed** (2026-10-18, not yet committed; no manual steps)

- **Poison pill:** `normalizeAggregateRow` returns `null` for a malformed row instead of throwing. `runRollup` skips those rows and returns `{ rows, skipped }`. `PostHogProvider.queryAggregates` no longer normalizes (it used to throw from inside the provider too).
- **Forgery:** new `RollupRowVerifier` (`apps/api/application/analytics/verifyRollupRows.ts`) runs before either upsert. A row is kept only when its ids are UUIDs, its pet (or owner) is active, its link belongs to that same owner, and its channel passes the new domain rule `isKnownChannelKey` (`channelPresets.ts`): a preset, `direct`, `search`, `default`, or a key on one of the owner's links, archived included. Three batched lookups per run (pets → owners, active users, links by owner), chunked at 100 ids per request. New repository methods: `IPetRepository.listOwnerIdsByIds`, `IUserRepository.listActiveIds`, `ITrackedLinkRepository.listByOwnerIds`.
- **Logging:** the handler logs one warning with skip counts per reason (`malformed`, `unknown_pet`, `unknown_owner`, `foreign_link`, `unknown_channel`), never the values, since those are attacker-controlled.
- **Filter injection:** new `postgrestFilters.ts` (`eqValue`, `inList`, `chunk`). Values are quoted for PostgREST grammar and then URL-encoded, since PostgREST decodes before parsing. Both rollup repositories use it for every filter, which also fixes the old `postgrestEq` (it escaped `"` as `""`, but PostgREST expects `\"`, and it never URL-encoded, so a city with `&` broke the patch).
- **Tests:** `test/api/rollupRowVerifier.test.ts` (valid rows kept; each forgery dropped and counted), `packages/analytics/src/rollup.test.ts` (six malformed rows skipped, the valid one still written), `test/api/repositories/postgrestFilters.test.ts`, and an encoding case in `analyticsDailyRepository.test.ts`. Removing the link-ownership check or the city encoding makes them fail. `npm run ci` passes (Jest 286/286, web unit 58/58).
- **Decision:** a pet row may carry a link from another of the same owner's pets. First-touch attribution follows the visitor across the owner's pages, so that's real traffic.
- **Limits, still open:**
  - Anyone can still inflate a _real_ pet's numbers with its real ids, which are public in URLs and in `GET /links/resolve`. Client-side analytics can't prevent that; the verifier only stops cross-owner and nonsense writes.
  - Rows written before this fix are not cleaned up. If you suspect forged rows, check `analytics_daily` / `analytics_owner_daily` for channel keys outside the allowed set.
  - If an owner renames a custom channel on a link, events within the 14-day window that still carry the old custom key are dropped as `unknown_channel`. Rows already stored under the old key stay.
  - Alarm on rollup errors is S6. The existing-rows read and `sumViewsByLinkIds` are still unchunked with `limit=10000` (L5).

### S4 — PostHog personal API key stored in a plaintext env var · Medium

**Where:** `infra/terraform/envs/{dev,prod}/main.tf:141`, `variables.tf` (`posthog_personal_api_key`)

**What:** The key is passed straight in as a Lambda environment variable. That makes it visible to anyone with `lambda:GetFunctionConfiguration`, and it is also stored in Terraform state. PostHog personal keys belong to a _user_, so the key may reach every project and org that user can see.

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

### C1 — No privacy policy; third-party processors undisclosed · Medium

**Where:** `apps/web` has no `/privacy` route and no link to one. Added 2026-10-18 while setting up Turnstile for S1.

**What:** v2 adds more third parties that receive visitor data:

- **Cloudflare Turnstile:** IP address, TLS fingerprint and User-Agent on inquiry submit.
- **PostHog:** cookieless events with city-level GeoIP.
- **SES:** inquiry email, with the sender as Reply-To.

These sit alongside Supabase and the server-side ZIP lookup to `api.zippopotam.us`. Inquiry name, email, message and ZIP also go to the foster parent being contacted. None of this is disclosed anywhere.

**Why it matters:** not a merge blocker, and fine for a private beta with known testers. It _is_ expected before a public launch, especially for EU visitors (GDPR). Cloudflare publishes a [Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/) to link from the policy.

**Fix:** add a static `/privacy` page that names each processor, and link it under the inquiry submit button, on sign-up, and site-wide. There's no shared footer today, only one on `HomePage`. Keep Turnstile pre-clearance off: the site isn't proxied through Cloudflare, so the `cf_clearance` cookie does nothing. Have the text reviewed before opening to the EU. Tracked in [`todo.md` §3](./todo.md).

---

## 2. Logic gaps and business edge cases

### L1 — Inquiries from foster-me links are rejected · Critical (verified)

**Where:** `apps/api/application/use-cases/CreateInquiryUseCase.ts:110`, `apps/web/client/features/inquiries/InquiryForm.tsx:252–263`

**What:** Foster-me links have `pet_id = null`, and resolve returns `petId: null`. In `InquiryForm`, `linkMatches` is `!source?.targetId || …`, which is `true`, so the form sends `sourceLinkId` along with `targetPetId`. The server then rejects it with `link.petId !== targetPetId`, because `null !== '<pet uuid>'`.

**Repro (probe test, since deleted):** Create a link with `POST /me/links`, create a pet, then `POST /inquiries` with `{ targetPetId, sourceLinkId, viaFosterMe: true }`. The response is `400 INQUIRY_INVALID_INPUT` with "Please provide a name, email, and message."

**Why it matters:** This is the flow 5b was built around: lawn sign → `foster-me?s=code` → tap a pet → inquire. Every attributed inquiry fails, and the error message points the visitor at the wrong fields. Nothing in the suite covers this combination.

**Fix:** In the use case, accept a `foster_me` link when `link.ownerId === target.id`, and keep the `petId` check for `pet` links. Add a regression test. Separately, return a distinct error code or message for an invalid source, or drop a bad `sourceLinkId` and still accept the inquiry. Attribution should never block contact.

**Status: ✅ Fixed** (2026-10-18, not yet committed)

- New domain rule `apps/api/domain/trackedLinks/linkCreditsInquiry.ts`: a link counts only if it belongs to the inquiry's owner. Foster-me links count for any inquiry to that owner, pet or profile. Pet links count only for that pet. Archived links still count.
- `CreateInquiryUseCase` drops a link that doesn't count and saves the inquiry without it (no more 400). It checks the id is a UUID before the lookup, and only uses the link's channel and label when the link counts, so another owner's label can't reach the notification.
- Also fixes a second broken flow: arriving on a pet link, then inquiring from the owner's profile.
- Tests in `test/api/inquiries.test.ts`: foster-me link on a pet inquiry and on a profile inquiry (channel and label come from the link), plus four cases where the link doesn't count (another owner's link, pet link on a profile inquiry, unknown id, malformed id). Removing the ownership check makes them fail.
- Left for S8: when a link is dropped, the browser's `sourceChannelKey` is still stored as sent, and a non-string `sourceLinkId` / `zipCode` / `sourceChannelKey` still causes a 500 (an existing bug).

### L2 — Owner self-views captured on refresh · High

**Where:** `apps/web/client/pages/pets/PetBioPage.tsx:35–39` (and `FosterMePage.tsx:59–67`)

**What:** `capturePetEvents` is `pet && !isOwner && !adopted`, and it doesn't wait for `authLoading`. On a hard refresh, the pet query often resolves before Supabase restores the session. `user` is still null at that point, so `pet_viewed` fires. The `seen` ref then blocks the correction. Owners refresh their own pages more than anyone, so their own views inflate their numbers.

`syncPetCaptureSuppression` is also called during render. That's a side effect in render, and it mutates module-global state that every route shares.

**Fix:** Gate capture on `!authLoading`, using the existing viewer hint for the no-session case. Move suppression into a `useEffect`, or pass it explicitly to `capturePetEvent` rather than relying on global module state.

**Status: ✅ Fixed** (2026-10-18, not yet committed; no manual steps)

- **Wait for auth:** `PetBioPage` and `FosterMePage` only turn capture on once `useAuth().loading` is false. On an owner's refresh, `pet_viewed` and `foster_me_viewed` now wait until the session restores, see the owner, and never fire. The same `capturePetEvents` flag gates `inquiry_form_opened` and `inquiry_submitted`, so those wait too.
- **No side effect in render:** `syncPetCaptureSuppression` is gone, and nothing in the app calls `setCaptureSuppressed` any more. Each page already passes an explicit capture flag down, so the module-global switch was only a backstop. It also outlived the page, since it stayed set after you left. `capturePetEvent` and `captureFosterMeViewed` no longer check it. `@lattice/analytics` still exports `setCaptureSuppressed` / `isCaptureSuppressed` and `track` still respects them, because the spec lists an opt-out hook as part of the package.
- **Decision: no viewer-hint shortcut.** For a visitor with no stored session, auth resolves locally (no network call), so waiting costs almost nothing. A hint can't prove someone is *not* the owner, so using it would bring the race back. The worst case is the 12 s auth bootstrap fallback in `AuthProvider`: a view from a visitor who leaves within that window is lost. That's better than counting the owner.
- **Tests:** `test/web/unit/PetBioPage.test.tsx` and `FosterMePage.test.tsx` each gained a "capture" block. The first test loads the page before auth resolves, then resolves it as the owner, and expects no event. The second resolves as signed out and expects exactly one event across rerenders. Both owner cases failed before the fix. `npm run test:web:unit` passes (58 files, 244 tests), and web type-check and lint are clean.

### L3 — Channel key collisions and picker duplicates · Medium

**Where:** `apps/api/domain/channels/channelPresets.ts:26`, `apps/api/application/use-cases/ListChannelsUseCase.ts:28`

- A custom channel named **"Direct"** gets the slug `direct` and merges with untagged and v1-QR traffic, which the UI labels "Direct / original QR". A channel named **"Search"** merges with Google referrals. Only `default` is reserved. Reserve every system key the referrer map can produce.
- `slugify` only lowercases and turns spaces into hyphens. "Vet Office!", "vet office" and "vet office " don't all group together. Strip punctuation and collapse repeated hyphens.
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
- **`approx_visitors` is effectively equal to `views`.** With `persistence: 'memory'`, every full page load gets a new `person_id`. The rollup then _sums_ `uniq` across city/link/day rows, which overcounts further. The UI never shows it, so the spec's "approx. visitors" label is missing. Either drop the column or define it honestly.
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

| Spec item                                                                          | Status                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Presets: Lawn sign, Instagram, Facebook, TikTok, Flyer, **Shelter listing, Other** | The last two were removed in `1f373e1`. Self-report still offers "Other" and "Shelter".                                                                                                             |
| "Email for every inquiry notification via SES"                                     | Code is done. **Not live:** `EMAIL_PROVIDER`, `EMAIL_FROM`, `ses:SendEmail` IAM and `WEB_ORIGIN` are not wired in Terraform. The footer link is relative (`/settings/notifications`) in production. |
| Turnstile spam protection                                                          | Code is done. **Not live** (S1).                                                                                                                                                                    |
| "Rollup job keeps the final numbers" on adoption                                   | Not implemented (L4)                                                                                                                                                                                |
| "approx. visitors" label                                                           | Not shown anywhere (L7)                                                                                                                                                                             |
| "Original QR" row explaining Direct traffic                                        | Gone. v1 signs that point at pet URLs now appear only as "Direct / original QR" in charts, and nothing on the links page explains them.                                                             |
| `packages/analytics` knows nothing about pets; configurable referrer map           | Not met (Q3)                                                                                                                                                                                        |
| Packages "liftable into Lattice"                                                   | Inconsistent build models (Q2) make lifting harder                                                                                                                                                  |
| PostHog setting: confirm GeoIP still runs with "Discard client IP"                 | No doc or checklist entry found. Add it to `docs/deploy-aws.md` or the package README.                                                                                                              |
| Owner self-views excluded                                                          | Fixed (L2)                                                                                                                                                                                          |

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

| Job           | Result  | Cause                                                                                                                                                                                                                                                                  |
| ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test (22.x)` | ❌      | `test/web/unit/SearchPage.test.tsx` (3 tests): `No "usePathname" export is defined on the "next/navigation" mock`. `AppHeader` now calls `useUnreadNotificationCount`, which uses `usePathname`. Add it to that test's mock, or to a shared mock in `vitest.setup.ts`. |
| `web-e2e`     | ❌      | `Cannot find module …/node_modules/@lattice/notifications/dist/index.js`. The API dev server can't start because the package was never built (Q2).                                                                                                                     |
| `terraform`   | skipped | —                                                                                                                                                                                                                                                                      |

**Status: ✅ Fixed** (2026-10-18, not yet committed; verified locally, not yet on GitHub CI)

- **Web unit:** adding `usePathname` to the mock isn't enough. The test then fails with "No QueryClient set", because the header's inbox badge (`useUnreadNotificationCount`) uses React Query. `SearchPage.test.tsx` now stubs that hook, the same way `AppHeader.test.tsx` does. `usePathname` is only called inside that hook, so it doesn't need mocking.
- **E2E:** `apps/api/package.json` gained `predev` and `predev:prod` hooks that build `@lattice/notifications` before `ts-node-dev` starts. npm runs these for `npm run dev -w @lattice/api` (Playwright's server command) and for `turbo run dev`, so a fresh clone works too.
- Verified locally: with `packages/notifications/dist` deleted, the API dev server reproduces the CI error before the fix and starts after it. `npm run test:web:e2e` passes 19/19 from that clean state. `npm run ci` passes (Jest 267/267, web unit 58/58 files).
- Still open under Q2: editing `packages/notifications/src` during `npm run dev` isn't picked up until a restart, and `deploy-aws.mjs` / `build:lambda` can still bundle a stale `dist/`. The structural fix is to pick one build model for both packages.

---

## 6. Suggested order before merge

1. ~~**L1**: Fix the foster-me inquiry check and add a regression test.~~ ✅ Done
2. ~~**CI**: Fix the `usePathname` mock and the notifications package resolution (Q2).~~ ✅ Done (the Q2 restructure itself is still open)
3. ~~**S1 / S2**: Wire `TURNSTILE_SECRET_KEY` and `INQUIRY_SOURCE_TOKEN_SECRET` through SSM, fail closed in production, and add per-route rate limits.~~ ✅ Done. SES and `WEB_ORIGIN` wiring is still open (section 4).
4. ~~**S3**: Validate and skip rollup rows, encode filter values~~ ✅ Done. The alarm is still open under S6.
5. ~~**L2**: Gate capture on auth having resolved.~~ ✅ Done
6. **S5, L3**: Harden email validation and reserve system channel keys.
7. Update `fosterfolio-v2-spec.md` to reflect 5b, then file L4–L8 and Q1–Q7 as follow-ups.

---

# Nice to have's

Non-critical improvements, not blocking merge. Add to this list as they come up.

### N1 — Animated feedback on each step of the inquiry submit flow

**Where:** `apps/web/client/features/inquiries/` — `InquiryForm.tsx`, `ExpandableInquiryForm.tsx`, `InquiryCta.tsx`. Also tracked in [`todo.md` §3](./todo.md). Not started.

**Today:** `onSubmit` already runs through distinct steps (Turnstile verify → `ensureAttribution()` → `POST /inquiries` → success → optional "How did you hear about {pet}?"), but the visitor only sees the button flip to "Sending…". Every transition is a hard swap: the expand dialog closes and the card switches to a static "Inquiry sent" alert in the same tick, and the source question vanishes silently once answered.

**Plan:**

1. **Explicit phase state in `InquiryForm`.** `phase: "idle" | "verifying" | "sending"`, set at each `await` and reset on error. Disable the fieldset on `phase !== "idle" || mutation.isPending` — today the form stays editable during the Turnstile wait (pairs with L6's no-feedback issue).
2. **New `SubmitProgress.tsx`.** Inline stepper under the submit button: _Checking_ (only when Turnstile is configured) → _Sending_ → _Sent_. Active step shows a spinning `Loader2`; each completed step swaps to a `Check` that pops in (`animate-in zoom-in-50 fade-in`), with the connector filling via a width transition. `role="status" aria-live="polite"` so each step is announced.
3. **Success beat.** Animated check badge on the sent alert (circle scales in, SVG check draws via a `stroke-dashoffset` keyframe in `globals.css`); alert fades and slides up, source question follows ~150 ms later. Answering or skipping shows a small "Thanks!" check instead of disappearing.
4. **Wrapper transitions.** Delay the parent's `onSuccess` by ~600 ms (0 under reduced motion) so the _Sent_ check finishes before `ExpandableInquiryForm`'s dialog closes or `InquiryCta`'s sheet swaps to success. The floating "✓ Inquiry sent" pill gets a fade/zoom-in plus one `motion-safe:animate-ping` ring, the same pattern as `LinksHero.tsx`.
5. **Tests.** Keep the `"Inquiry sent"` and "How did you hear about …?" strings — unit and E2E specs assert on them. Add unit cases for the progress row (sending → sent, error resets and keeps the draft) and update `ExpandableInquiryForm.test.tsx` for the delayed close. Put the reduced-motion check and delay in a small `motion.ts` helper so tests can force a 0 ms delay.

**Constraints:** CSS only — `tw-animate-css` is already imported in `globals.css` and drives the dialog/sheet transitions, so no new dependency. Every animation gets `motion-safe:` / `motion-reduce:` variants, matching `LinksHero` and `FosterMePreview`.

**Verify:** `npm run test:web:unit`, the inquiry E2E specs, then a manual pass on pet bio (desktop card, expanded dialog, mobile sheet), public profile and foster-me, with OS reduced motion both on and off.
