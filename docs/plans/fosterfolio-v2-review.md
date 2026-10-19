# Fosterfolio v2 — PR #22 Review

**PR:** [#22](https://github.com/brendanprobst/fosterfolio/pull/22) · branch `v2/advanced-link-management` → `main` · head `b27d7ca`
**Size:** 334 files, +23,971 / −2,045, 44 commits
**Reviewed against:** [`fosterfolio-v2-spec.md`](./fosterfolio-v2-spec.md), plus [`v2_slice5b_foster_me_links.plan.md`](./v2_slice5b_foster_me_links.plan.md) where it intentionally changes the spec
**Method:** I read the diff locally by area (infra, migrations, API, packages, web). One throwaway Jest probe confirmed L1, and I pulled the PR's CI logs. I did not run the full suite locally.
**Second pass:** 2026-10-19 at head `557a142`, covering the 19 commits since `b27d7ca` plus a sweep for anything the first pass missed. See [section 7](#7-second-pass-2026-10-19-head-557a142), which ends with the go/no-go for the private beta.

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
| S4   | Medium   | Security/Infra | PostHog personal API key in a plaintext Lambda env var and TF state                                   | Partly fixed (scoped key; SSM deferred) |
| S5   | Medium   | Security       | `mailto:` injection through sender email                                                              | ✅ Fixed                               |
| L3   | Medium   | Logic          | Custom channel names collide with system keys (`direct`, `search`); picker shows duplicates           | ✅ Fixed                               |
| L4   | Medium   | Logic          | "Adopted freeze" is client-only; the rollup keeps rewriting numbers                                   | ✅ Fixed (dev migrated; prod at launch) |
| L5   | Medium   | Logic/Perf     | Rollup upsert: one row per request, silent truncation, partial writes                                 | ✅ Fixed (dev migrated; prod at launch) |
| L6   | Medium   | Logic/UX       | Turnstile client: submit does nothing silently; token not reset for retry                             | ✅ Fixed                               |
| S6   | Low      | Infra          | Rollup shares the API IAM role; no alarm; deployed with empty creds it fails every hour               | ✅ Fixed (needs `deploy:aws`, confirm SNS email) |
| S7   | Low      | Infra/Hygiene  | Lambda zip build artifacts committed to git                                                           | ✅ Fixed (history keeps old copies)    |
| S8   | Low      | Security       | Missing input bounds (label, channel name, cursor), unvalidated client `sourceChannelKey`             | ✅ Fixed (dev migrated; prod at launch) |
| C1   | Medium   | Compliance     | No privacy policy; third-party processors (Turnstile, PostHog, Supabase, SES, Zippopotam) undisclosed | Open (blocks public launch, not merge) |
| L7   | Low      | Logic          | Metric semantics: conversion can exceed 100%; "approx visitors" is meaningless and hidden; UTC days   | Open                                   |
| L8   | Low      | Perf/Data      | Inbox does N+1 lookups; notification payload duplicates PII it then overwrites                        | Open                                   |
| L9   | Medium   | Logic/Perf     | Analytics and inquiry list reads silently stop at PostgREST's 1,000-row cap                           | Open                                   |
| E1   | High     | Infra          | Inquiry email isn't live: no SES env vars, IAM or `WEB_ORIGIN` on the Lambda; failed sends unlogged   | ✅ Fixed (needs `deploy:aws`)          |
| Q1   | Medium   | DRY            | Two near-identical rollup repositories; the coalesced key is defined 3 times                          | Open                                   |
| Q2   | Medium   | Structure      | Two workspace packages built two different ways; 4 places to keep aliases in sync                     | Open                                   |
| Q3   | Medium   | Structure      | `@lattice/analytics` isn't app-agnostic (pet-shaped rows, hardcoded referrer map)                     | Open                                   |
| Q4   | Low      | DRY            | Link-code generation loop duplicated; self-reported source list duplicated API↔web                    | Open                                   |
| Q5   | Low      | Dead code      | Pet-target link endpoints, `approx_visitors`, `analytics_stopped_at` are unused                       | Open                                   |
| Q6   | Low      | Structure      | Migration symlinks + master snapshots duplicate about 2.3k lines of SQL                               | Open                                   |
| Q7   | Low      | Perf           | Owner widget makes 3 requests where one summary would do                                              | Open                                   |
| Q8   | Low      | Hygiene        | PR is too large to review and the description is empty                                                | Open                                   |
| P1   | Critical | Infra/Deploy   | Prod already runs a v2 branch build on the v1 schema: pet reads and link resolve return 500           | ✅ Schema fixed (prod redeploy pending) |
| R1   | Low      | Data           | L4 backfill bumps `pets.updated_at` on prod through `pets_touch_updated_at`                            | Accepted (already ran on prod)         |
| R2   | Low      | Logic          | Verifier's `listByOwnerIds` isn't paged past PostgREST's 1,000 rows                                    | Open (with L9)                         |
| R3   | Low      | Infra          | A missing inquiry SSM parameter takes the whole API down, not just inquiries                           | Accepted (by design)                   |
| R4   | Low      | Logic          | HogQL `toDate(timestamp)` may use the PostHog project timezone; freeze compares UTC days                | Open (check project setting)           |
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
- **Still open (not part of this finding):** SES (`EMAIL_PROVIDER`, `EMAIL_FROM`, `ses:SendEmail` IAM) and `WEB_ORIGIN` on the Lambda (E1, since fixed); a `siteverify` timeout (L6, since fixed).
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
  - Alarm on rollup errors is S6. The existing-rows read and `sumViewsByLinkIds` are still unchunked with `limit=10000` (L5, since fixed: the read is gone and the totals are summed in SQL).

### S4 — PostHog personal API key stored in a plaintext env var · Medium

**Where:** `infra/terraform/envs/{dev,prod}/main.tf:141`, `variables.tf` (`posthog_personal_api_key`)

**What:** The key is passed straight in as a Lambda environment variable. That makes it visible to anyone with `lambda:GetFunctionConfiguration`, and it is also stored in Terraform state. PostHog personal keys belong to a _user_, so the key may reach every project and org that user can see.

**Fix:** Store it as an SSM SecureString and load it with `loadSupabaseEnvFromSsm` (generalize that helper). Create a **project-scoped key with `query:read` only**.

**Status: partly fixed** (2026-10-19; dev rotated, prod gets its scoped key at launch)

- **Rotated (dev):** the old key had 93 scopes, so it could change settings and delete data in every org and project the PostHog user belongs to. It's replaced with a key that has only `query:read`, restricted to the Fosterfolio project. That's enough: the rollup's only PostHog call is `POST /api/projects/<id>/query/` (`packages/analytics/src/posthogProvider.ts:61`), and nothing else uses the key. The new key is in dev Infisical `/fosterfolio/sensitive`, and dev is redeployed.
  - **Verified:** a manually invoked dev rollup returned `{"rows":19}` with no errors. A SHA-256 comparison (no values printed) confirmed the Lambda's key matches Infisical and differs from the old key.
  - **Manual step:** delete the old key in PostHog if it isn't already gone. Its copy in dev's local `terraform.tfstate.backup` is harmless once it's revoked.
- **Decision: keep the key as a Lambda env var for now. The SSM move is deferred.** With the scope cut, a leak only exposes reads of one project's events. The remaining exposure is anyone with `lambda:GetFunctionConfiguration` on the account, plus the local state file. That's acceptable for a private beta. Revisit with SSM (the S2 pattern) before a public launch, or if more people get AWS access.
- **Prod:** create a separate key with the same scope, restricted to the prod PostHog project if it's a separate project. Put it in prod `/fosterfolio/sensitive` before the launch deploy.
- **Docs:** `docs/playbooks/infisical-github-deploys.md` now lists `POSTHOG_PROJECT_ID` (and `NEXT_PUBLIC_POSTHOG_TOKEN`) under `/fosterfolio/shared`, and the key's required scope under `/fosterfolio/sensitive`.

### S5 — `mailto:` injection through sender email · Medium

**Where:** `apps/api/application/use-cases/CreateInquiryUseCase.ts:37` (`EMAIL_RE`), `apps/web/client/pages/inbox/InboxView.tsx:149,161`

**What:** `EMAIL_RE` (`^[^\s@]+@[^\s@]+\.[^\s@]+$`) accepts `a@b.co?bcc=evil%40x.com&body=…`. The inbox puts the raw value into `href={\`mailto:${email}?subject=…\`}`. When the owner clicks **Reply by email**, the draft gets a hidden BCC or a pre-filled body. The same value is used as SES `ReplyToAddresses`, which SES rejects, so the notification email quietly fails too.

**Fix:** Use a stricter address check that rejects `?`, `&`, `%`, `,` and `;`. Also `encodeURIComponent` the address in the `mailto:`.

**Status: ✅ Fixed** (2026-10-18, not yet committed; no manual steps)

- **API:** new `apps/api/domain/value-objects/EmailAddress.ts` (`isValidEmailAddress`) replaces `EMAIL_RE` in `CreateInquiryUseCase`. It accepts ASCII `dot-atom@domain` only: the HTML `type="email"` local-part characters minus `%`, `&` and `?`, no leading, trailing or doubled dots, hostname labels with at least one dot, and RFC lengths (64-char local part, 63-char labels, 254 total). That rules out `?`, `&`, `%`, `,`, `;`, whitespace/CRLF, display names (`Name <a@b.co>`), quoted local parts, comments and IP-literal domains. A rejected address returns `400 INQUIRY_INVALID_INPUT` before Turnstile, storage or email, so SES never sees a Reply-To it would refuse.
- **Web:** `InboxView` builds both `mailto:` links with `mailtoHref()`, which percent-encodes each side of the last `@`. Inquiries stored before this fix (or written straight to the DB) still can't add `?bcc=`, `&body=` or a second recipient. A normal address renders exactly as before (`mailto:jamie@example.com`). I encoded each side separately instead of the whole string so the `@` stays literal, which RFC 6068 expects.
- **Decision: ASCII only.** Unicode local parts and non-punycode domains (`josé@…`, `…@bücher.de`) are now rejected. The old regex accepted them, but SES doesn't support SMTPUTF8: it needs an ASCII local part and a punycode domain, so those inquiries' emails were failing anyway. Punycode domains (`xn--…`) still pass. Visitors see the existing "Please provide a name, email, and message." error.
- **Tests:** `test/api/emailAddress.test.ts` covers 5 valid addresses, 28 rejected ones (the injection payloads from this item, lists, display names, quoting, dot and label structure, CRLF, Unicode, each length limit) and the exact length boundaries. `test/api/inquiries.test.ts` gained "rejects a sender email that would inject mailto: headers": three payloads each get 400 with no inquiry, notification or email. Against the old use case it fails (201). `test/web/unit/InboxView.test.tsx` gained a stored-payload test that checks both hrefs are encoded. It failed before `mailtoHref`.
- **Verified:** `npm run ci` passes (Jest 42 suites / 321 tests, web unit 58 files / 245 tests, lint, type-check, build).
- **Still open:** the inquiry form doesn't pre-check the stricter rule. The browser's `type="email"` still allows `%`, `&` and `?`, so those rare addresses only fail on submit. Other input bounds (label, channel name, cursor, `sourceChannelKey`) stay with S8.

### S6 — Rollup Lambda operations · Low

**Where:** `infra/terraform/envs/*/main.tf:123–167`

- ~~The rollup reuses `aws_iam_role.api_lambda`. Today that role can only read SSM. When SES permissions are added for S1/email, the rollup will get them too. Give it its own role.~~ ✅ Done with E1: `analytics_rollup_lambda` reads only the two Supabase parameters.
- There's no CloudWatch alarm on `Errors` and no DLQ. Combined with S3, the job can fail silently for weeks.
- `deploy-aws.mjs` warns when the PostHog creds are missing, then deploys anyway. The Lambda then throws `Missing required environment variable` 24 times a day. Use `count = var.posthog_project_id == "" ? 0 : 1` instead.

**Status: ✅ Fixed** (2026-10-19, not yet committed; needs `infisical run -- npm run deploy:aws`, then confirming the SNS subscription email)

- **Own role:** done with E1 (`analytics_rollup_lambda`).
- **Alarms:** new `infra/terraform/envs/{dev,prod}/alarms.tf`.
  - SNS topic `<project>-<env>-alarms` with an email subscription per `alarm_email_addresses` (new variable, default `[]`). Both local tfvars now set it to `bprobst1029@gmail.com`.
  - `…-analytics-rollup-errors`: Lambda `Errors` ≥ 1 in 2 of the last 3 hourly periods. **Decision: 2 of 3, not 1 failure.** One transient PostHog or Supabase error recovers on the next run and shouldn't page. A run that fails every hour still alarms within about 2 hours.
  - `…-api-errors`: Lambda `Errors` ≥ 3 in 5 minutes. Express turns route errors into 500s, so this counts only crashes, timeouts and failed cold starts (a missing SSM parameter, the production secret checks). It's not in the original finding, but it costs the same few lines.
  - Both alarms email on recovery too (`ok_actions`), and treat missing data as OK.
  - Cost: 4 standard alarms across both envs, about $0.40/month. SNS email is free at this volume.
- **Missing PostHog creds:** **decision: disable the schedule instead of `count = 0`.** With `count`, a Terraform run without the PostHog variables (no Infisical, or a by-hand `terraform apply`) would *destroy* the rollup Lambda. Now `analytics_rollup_enabled` is false when either value is empty. The hourly rule then goes `DISABLED`, and the next deploy with both values turns it back on. The flag is `nonsensitive()`, because otherwise plans hide `ENABLED`/`DISABLED` behind "(sensitive value)". The three `deploy-aws.mjs` warnings now say the schedule will be disabled. `docs/deploy-aws.md` explains this and the alarms.
- **Found on the first dev deploy (2026-10-19): the dev rollup had been failing every hour for days.** CloudWatch showed `Missing required environment variable` on every run back to at least 2026-10-16 (72 errors a day: 24 runs × 3 attempts), so dev analytics hadn't refreshed. Nothing reported it, which is this finding's point.
  - **Cause:** `POSTHOG_PROJECT_ID` is in Infisical `/fosterfolio/shared`, but `scripts/posthog-infisical.mjs` only read `/fosterfolio/sensitive`. Every deploy set an empty project ID.
  - **Fix:** `loadPosthogTfEnv` exports both paths. It reads the project ID and `POSTHOG_HOST` from `/shared` (a copy in `/sensitive` still works, and `/shared` wins). It reads the personal key from `/sensitive` only, so GitHub Deploy app, which can read `/shared`, never supplies it. If one export fails, it uses the other. "Partial" warnings now name the missing value and its path. `docs/deploy-aws.md` is updated.
  - **Tests:** `test/scripts/posthog-infisical.test.mjs` grows from 3 to 10 cases (path precedence, the key never read from `/shared`, per-path export failures, statuses). Four fail against the old code. These script tests run with `node --test test/scripts/posthog-infisical.test.mjs`. `npm run ci` doesn't include them.
  - **Checked against the real dev Infisical:** the loader now returns `loaded` with both values.
  - **Also found:** dev `/fosterfolio/shared` has `NEXT_PUBILC_POSTHOG_TOKEN` (typo). The web app reads `NEXT_PUBLIC_POSTHOG_TOKEN`. The deployed dev bundle still has a token, probably from `apps/web/.env.local`, so capture works. Rename the secret so it doesn't depend on that local file. **Prod has no PostHog keys in Infisical at all.** Add `POSTHOG_PROJECT_ID` (`/shared`), `POSTHOG_PERSONAL_API_KEY` (`/sensitive`) and `NEXT_PUBLIC_POSTHOG_TOKEN` before launch, or the prod rollup deploys with its schedule off.
- **No DLQ.** EventBridge invokes asynchronously, Lambda retries a failed run twice, and the next hourly run redoes the full 14-day window. Nothing is lost that a DLQ would keep, so the alarm is enough.
- **Plans:** `terraform validate` passes in both envs.
  - Dev `terraform plan` with both PostHog variables set (placeholders): 4 to add (topic, subscription, 2 alarms), 1 changed (the rollup's env, from the placeholder key), no schedule change.
  - Dev plan without them: the rule goes `ENABLED → DISABLED`.
  - Prod plan: the same 4 resources on top of E1's and S1's pending changes (12 to add, 4 to change, 0 to destroy).
- **Not tested:** there are no automated Terraform tests here. The alarms haven't fired yet.
- **Manual steps:**
  1. `infisical run -- npm run deploy:aws` for dev. Check that the deploy prints "PostHog project … from Infisical", or the schedule turns off.
  2. Click "Confirm subscription" in the AWS Notifications email. Nothing is delivered until you do.
  3. Optional end-to-end check: `aws cloudwatch set-alarm-state --alarm-name fosterfolio-dev-api-errors --state-value ALARM --state-reason test --region us-east-1` sends the email, and the next evaluation resets it.
  4. Prod: the same at launch, plus confirming prod's subscription.

### S7 — Lambda zip artifacts committed · Low

**Where:** `infra/terraform/envs/dev/.generated/analytics-rollup-lambda.zip` (new) and `.generated/api-lambda.zip` (dev and prod, both tracked)

**What:** About 1.5 MB of bundled API code goes into git history on every deploy. `archive_file` regenerates these files anyway. I grepped the rollup bundle and found no embedded keys, but the full bundled API code is still in history.

**Fix:** Add `**/.generated/` to `.gitignore` and run `git rm --cached`.

**Status: ✅ Fixed** (2026-10-19)

- `.gitignore` has `**/.generated/`, and the four zips (dev and prod, API and rollup) are untracked with `git rm --cached`. The files stay on disk, and `archive_file` rebuilds them on every plan or apply. Nothing else reads them: CI only runs `terraform validate`, and `deploy-app.yml` builds its own bundle.
- **Why now:** a push of 18 commits failed with `HTTP 400` / "remote end hung up". Nine of the objects were these zips, about 1.2 MB each for the API bundle, which pushed the request past git's default 1 MB `http.postBuffer`. That push went through with `git -c http.postBuffer=524288000 push`.
- **Not done: rewriting history.** Earlier commits still carry the old zips. I grepped the bundles for keys before (no embedded secrets), so they cost only repo size. A `git filter-repo` would rewrite the shared branch, so it isn't worth it.

### S8 — Input bounds · Low

- `label` and custom `channelName` have no length limit in the API or the DB. Express's default 100 KB body means 100 KB channel names can end up in everyone's picker. Add a `check (char_length(...) <= N)` and validate in the use cases.
- When no link id is sent, the client's `sourceChannelKey` is stored as-is (up to 64 characters), so arbitrary keys show up in `byChannel`.
- The notification cursor (`decodeNotificationCursor`) only checks that the fields are strings before they go into a PostgREST `or=(…)`. `encodeURIComponent` doesn't protect PostgREST grammar, because PostgREST parses after URL-decoding. The `recipient_id` AND keeps this safe today. Validate them as ISO timestamp and UUID.
- `GET /links/resolve/:code` returns `ownerId` and `petId`, including for soft-deleted pets. Only `linkId`, `channelKey` and `target` are needed for attribution.

**Status: ✅ Fixed** (2026-10-18, not yet committed; the new migration must be pushed wherever the branch is deployed)

- **Bounds:** custom channel names are capped at 40 characters, stored channel keys at 64 and labels at 100, all counted after trimming. `resolveChannel` (`apps/api/domain/channels/channelPresets.ts`) enforces the name and key bounds for all three link use cases. The new `apps/api/domain/trackedLinks/trackedLinkLabel.ts` (`isValidTrackedLinkLabel`) enforces the label bound in `CreateTrackedLinkUseCase`, `UpdateTrackedLinkUseCase` and `CreateOwnerLinkUseCase`. Anything over returns `400 TRACKED_LINK_INVALID_INPUT`, so a 100 KB name never reaches the picker. Lengths are counted in code points (`charLength`), the same as Postgres `char_length`, so the API and the DB agree on emoji. The key has its own bound because lowercasing can lengthen a few letters: 40 × "İ" slugs to 79 characters.
- **Default link label:** `"<display name>'s default link"` used to be unbounded, because display names have no limit. `defaultLinkLabel` now shortens the name with an ellipsis so the label fits in 100 characters.
- **DB:** new feature migration `supabase/migrations/feature-migrations/20261018120000_app_v2_link_input_bounds.sql` (plus its CLI symlink) adds `tracked_links_channel_name_length` (≤ 40), `tracked_links_channel_key_length` (≤ 64) and `tracked_links_label_length` (≤ 100). The master is rebuilt as `LATEST_20261018.sql`, and `LATEST_20261010.sql` moved to `archive/`.
- **Decision: a new migration, not an edit to the branch's tracked-links migration.** Prod has no `tracked_links` rows, so either works there. But dev has already applied `20261008133000_app_v2_tracked_links.sql`, and the CLI won't re-run an edited file, so dev would never get the checks. The new file applies cleanly on both. Both seeds fit: the longest label is the Ferry Building one at 86 characters, and every channel name is under 15.
- **Client `sourceChannelKey`:** with no credited link, `CreateInquiryUseCase` now keeps the browser's key only when it's a system key (`isSystemChannelKey`) or a key on one of the target owner's links, archived included (`isKnownChannelKey` over `listChannelPairsByOwner`). That's the same rule the S3 rollup applies. Anything else, including another owner's custom key carried over from a dropped link, is stored as `null`, and the inquiry still goes through. The owner's links are only read when the key isn't a system key.
- **Decision: drop an unknown or over-long key instead of rejecting the inquiry.** A key over 64 characters used to return 400. It's now just an unknown key and gets dropped, following L1's rule that attribution never blocks contact.
- **Non-string fields (the L1 leftover):** `targetPetId`, `zipCode`, `sourceLinkId`, `sourceChannelKey` and `turnstileToken` must be a string or null. A number, array or object now returns `400 INQUIRY_INVALID_INPUT` instead of throwing on `.trim()` (500). `resolveChannel` does the same check for `channelKey` / `channelName`, which had the same 500 on the link routes. The required inquiry fields were already safe, because the controller wraps them in `String()`.
- **Notification cursor:** `decodeNotificationCursor` now accepts only an ISO timestamp, in the shapes Postgres (`…56.123456+00:00`) and `toISOString()` (`…56.123Z`) emit, and a UUID id. A forged cursor gets `400 NOTIFICATION_INVALID_INPUT` before it reaches the PostgREST `or=(…)`.
- **Resolve:** `GET /links/resolve/:code` no longer returns `ownerId`. The web client never read it. **Correction to this finding:** `petId` stays. `parseTrackedLinkResolve` (`apps/web/client/lib/analytics/initFosterfolioAnalytics.ts`) maps it to `targetId`, and `capturePetEvent` uses that so a pet link isn't credited on a different pet. A soft-deleted pet's id exposes nothing except an id for a page that no longer loads. Swagger is updated.
- **Web:** the create-link dialog's custom-channel and label inputs now have `maxLength` 40 and 100, so owners can't type past the limit and hit the generic error. The browser counts UTF-16 units, which is stricter than the API for emoji, never looser.
- **Tests:** `test/api/utils/channelPresets.test.ts` covers the name bound at and over the limit, a 100 KB name, the "İ" key overflow, code-point counting, and non-string input. `trackedLinkUseCases.test.ts` gained an "input bounds" block: label limits on all three use cases (the stored label is unchanged after a rejected update), the name limit on all three, non-string channel input, and the shortened default label. The resolve expectations there and in `trackedLinks.test.ts` no longer include `ownerId`. `inquiries.test.ts` gained the channel-key keep/drop table (system, preset, the owner's archived custom key, another owner's key with and without its link, a made-up key, a 5,000-character key) and the non-string table. The new `test/api/utils/notificationQuery.test.ts` covers four real timestamp shapes and ten forged cursors. `notifications.test.ts` pages with a real cursor and rejects a forged one. `OwnerLinksPage.test.tsx` checks the two `maxLength`s. Against the old implementations, 2 cursor tests, 2 inquiry tests, 6 link use-case/integration tests, 4 `resolveChannel` tests and the web test all fail.
- **Verified:** `npm run ci` passes (Jest 43 suites / 354 tests, web unit 59 files / 249 tests, lint, type-check, build). The migration was **not** applied to a real database: Docker isn't running here, and plain Postgres can't load the Supabase `auth` schema. The checks are plain `char_length` constraints, but run the push on dev before prod.
- **Manual step: push the migration.** ✅ **Dev done** (2026-10-18): `npm run supabase:push` applied `20261018120000_app_v2_link_input_bounds.sql` cleanly, and `supabase:list` shows it on the remote. No existing dev row broke a bound. The dev arming flag (`supabase/.env.local`) had been left at `1`; it's back at `0`. **Prod is deliberately not pushed yet.** It only has the v1 schema, so it will take all three v2 migrations at launch. See "Prod schema at launch" under the suggested order.
- **Still open:**
  - The create-link dialog still shows the generic "Please provide a valid channel and link details." for reserved names ("Direct", "Search"). That's L3's leftover. Labels and channel names over the limit can't be typed any more.
  - The inquiry form still doesn't pre-check S5's stricter email rule.
  - A cursor with an impossible calendar date (e.g. Feb 30) passes the shape check and fails in Postgres as a 500. It can't change the filter.
  - `inquiries.source_channel_key` has no DB length check. The API now only writes system keys and the owner's own keys (≤ 64).

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

**Status: ✅ Fixed** (2026-10-18, not yet committed; no manual steps)

- **Reserved keys:** `resolveChannel` now rejects every key the referrer map can produce that isn't a preset (`direct`, `search`), plus `default`. It checks both a passed `channelKey` and the slug of `channelName`, so "Direct", " SEARCH ", "Direct!" and "-search-" all return `400 TRACKED_LINK_INVALID_INPUT` on create and update. "Direct mail" (`direct-mail`) is still allowed. The referrer map (`packages/analytics/src/referrer.ts`) only emits `direct`, `search`, `instagram`, `facebook` and `tiktok`; the last three are presets and already map onto them.
- **Slugify:** lowercases, turns every run of non-letter/non-digit characters into one hyphen, and trims hyphens from both ends. "Vet Office!", "vet office", "vet office " and "--Vet -- Office__" all become `vet-office`. Unicode letters stay (`café-crème`). A name made only of punctuation or emoji now slugifies to an empty string and is rejected (it used to be stored as-is). Presets now match on the slug of their name too, so "Lawn Sign!" and "lawn_sign" resolve to the `lawn_sign` preset instead of a lookalike custom `lawn-sign`.
- **ListChannels:** dedupes on key only. The first link with a key fixes its position, and the newest link's name wins (repo pairs come back `created_at` ascending). It also skips every system key (`isSystemChannelKey`: presets, `direct`, `search`, `default`) instead of only presets and `default`, so a hand-written row can't add a second `direct` to the picker.
- **Display names (web):** `channelDisplayName` names `search` "Search" and `default` "Default link", alongside the existing "Direct / original QR". These system names come before link and picker names. The lookup uses a `Map`, so a custom key like `constructor` doesn't resolve to an `Object.prototype` member.
- **Decision: no migration.** `tracked_links` is new on this branch and isn't on `main`, so prod has no stored keys. Both seeds (`tracked-links.sql`, `v2-analytics.sql`) already use keys the new slugify produces (`vet-office`, `farmers-market`, presets, `default`), and none uses `direct` or `search`. If you have a dev or staging DB with links created through the UI from punctuated names (e.g. key `vet-office!`), those keep their old key. New links with the same name get the clean key, so their analytics split until you re-create the link.
- **Drift guard:** `@lattice/analytics/server` now also exports `channelKeyFromHostname`. `test/api/utils/channelPresets.test.ts` runs it over sample hosts and asserts every result is a system key, so a new referrer channel that isn't reserved fails CI.
- **Tests:** `channelPresets.test.ts` covers slug normalization, preset matching by slug, 9 reserved names, 4 reserved keys, the `direct-mail` allow case, `isSystemChannelKey` and the referrer drift. `trackedLinkUseCases.test.ts` gained "one entry per key, newest name" and "stored system keys stay out of the picker". `test/web/unit/channelDisplayName.test.ts` is new. Against the old implementations, 12 domain tests, 2 use-case tests and 1 web test fail. `test/api/trackedLinks.test.ts` asserted the old duplicate picker entries (`Vet Office` and `vet office` both under `vet-office`), so it now expects one entry with the newest name.
- **Verified:** `npm run ci` passes (Jest 42 suites / 341 tests, web unit 59 files / 248 tests, lint, type-check, build).
- **Still open:** the create-link dialog doesn't explain the reserved names. "Direct" or "Search" gets the generic "Please provide a valid channel and link details." The channel-name length bound stays with S8.

### L4 — "Adopted freeze" is client-only · Medium

**Where:** `apps/api/application/analytics/fosterfolioDailyQuery.ts:8`, `apps/api/domain/entities/Pet.ts:183–188`

**What:** The spec says the rollup "keeps the final numbers." Instead, it re-aggregates the last 14 days every hour and overwrites them. It also ignores `analytics_stopped_at`. Events from cached tabs, slow clients, or forged sources (S3) after adoption still move the "Final results." The column is written but never read. Pets that were already adopted before the migration have `analytics_stopped_at = null`.

**Fix:** Filter rollup rows where `day > analytics_stopped_at` with a join or lookup. Backfill `analytics_stopped_at = updated_at` for pets already marked adopted.

**Status: ✅ Fixed** (2026-10-18, not yet committed; dev is migrated, and the rollup Lambda needs a redeploy)

- **Rollup:** `IPetRepository.listOwnerIdsByIds` is now `listRollupPetsByIds`, which returns `{ ownerId, analyticsStoppedAt }` per active pet from the same chunked `pets` read (`select=id,owner_id,analytics_stopped_at`). `RollupRowVerifier` drops a pet row when its `day` is after the UTC day of `analytics_stopped_at`. The rows are counted in a new `frozen` field, not in `skipped`, so they don't trigger the "untrusted rows" warning.
- **Decision: the adoption day itself is still refreshed.** `day` is a UTC date, and the stop is a timestamp. Keeping that day means views from the morning of adoption still count, and views from later that day count too. Dropping it would lose real pre-adoption traffic.
- **Decision: owner rows are not frozen.** `analytics_owner_daily` belongs to the owner's foster-me page, which stays live. Its `pet_taps` can still include taps on an adopted pet. That's a small leak and stays open.
- **Ownership checks run first.** A forged row for an adopted pet still counts as `foreign_link` / `unknown_channel`, not `frozen`.
- **DB:** new feature migration `supabase/migrations/feature-migrations/20261018230000_app_v2_adopted_freeze.sql` (plus its CLI symlink):
  - Backfills `analytics_stopped_at = updated_at` for `status = 'adopted'` pets where it is null. This applies to prod's v1 pets. `updated_at` is bumped by every edit, so a pet edited after adoption freezes a little later than its real adoption date.
  - **Decision: delete stored rows dated after the stop.** They came from views after adoption, the rollup no longer rewrites them, and `analytics_link_view_totals` would count them forever. The delete uses the same UTC-day rule as the verifier. On prod, `analytics_daily` is created empty in the same push, so it deletes nothing.
  - The master is rebuilt as `LATEST_20261018.sql`. The L5 master moved to `archive/LATEST_20261018_rollup_bulk_upsert.sql`, because `archive/LATEST_20261018.sql` already holds the earlier same-day master.
- **Seed:** no change. `v2-analytics.sql` already stops Biscuit's rows at his `analytics_stopped_at` (`until_days`), so the delete removes nothing seeded.
- **Un-adopting:** `Pet.applyUpdate` clears `analytics_stopped_at` when a pet leaves `adopted`, and the next run rewrites the last 14 days. Deleted rows older than 14 days don't come back.
- **Tests:** `test/api/rollupRowVerifier.test.ts` gains "freezes an adopted pet" (rows before and on the stop day kept, the day after dropped, a sibling pet and owner rows untouched, `frozen: 1`). `test/api/analyticsRollup.test.ts` gains an end-to-end case: the fake `pets` lookup returns `analytics_stopped_at`, only the two rows up to the stop day are upserted, owner rows are written, and nothing is logged. Both fail before the change.
- **Verified:** `npm run ci` passes (Jest 46 suites / 373 tests, all 11 turbo tasks).
- **Not tested:** no automated test runs the migration SQL. It applied cleanly on dev (`supabase:list` shows `20261018230000` on both sides).

### L5 — Rollup upsert scalability and atomicity · Medium

**Where:** `AnalyticsDailyRepository.upsert` (`:72`), `AnalyticsOwnerDailyRepository.upsert` (`:119`)

**What:**

- Every row costs one HTTP insert or patch, and the timeout is 60 s.
- `pet_id=in.(…)` grows with the number of active pets until it hits URL-length limits.
- `limit=10000` on the "existing" read and in `sumViewsByLinkIds` silently truncates. Unique-violation fallback hides it for writes, but link **totals** come back wrong.
- A failure partway through leaves a half-written day.

**Fix:** Replace the expression index with `unique nulls not distinct (pet_id, link_id, channel_key, city, day)` (Postgres 15+, which Supabase has). Then a single bulk `POST …?on_conflict=…` with `resolution=merge-duplicates` does the whole upsert. Or write one SQL RPC that upserts a JSON array in a single transaction. Do the per-link totals in SQL with `group by`.

**Status: ✅ Fixed** (2026-10-18, not yet committed; dev is migrated, and the Lambdas still need a redeploy)

- **Correction to this finding:** the truncation was worse than `limit=10000`. Supabase caps every PostgREST read at `max_rows = 1000` (`supabase/config.toml`, and the hosted default), so the reads stopped at 1,000 rows with no error.
- **Upsert:** `AnalyticsDailyRepository.upsert` and `AnalyticsOwnerDailyRepository.upsert` now send one `POST <table>?on_conflict=<key columns>` with `Prefer: resolution=merge-duplicates,return=minimal` and the whole batch in the body. One statement means one transaction, so a failure writes nothing for that table. There's no "existing" read, no `in.(…)` list in the URL, and no per-row insert or patch. The unique-violation fallback, the patch helper and the `postgrestFilters` imports are gone from both repositories.
- **Duplicate keys:** one `on conflict do update` statement fails if it touches the same row twice. Two PostHog groups can normalize to the same key (`" Austin"` and `"Austin"`, or a UUID with and without padding), and since properties are client-writable that would be a new poison pill (S3). The new `sumRowsByKey` (`apps/api/infrastructure/analytics/sumRowsByKey.ts`) folds them first, using the existing `analyticsDailyKey` / `analyticsOwnerDailyKey`. No 4th copy of the key.
- **Decision: sum duplicate keys instead of keeping the last one.** The old per-row loop let the last row win. Both groups are real traffic, so their counts are added. The interface docs now say so.
- **DB:** new feature migration `supabase/migrations/feature-migrations/20261018200000_app_v2_rollup_bulk_upsert.sql` (plus its CLI symlink):
  - `analytics_daily_uniq` and `analytics_owner_daily_uniq` are rebuilt as plain-column `unique … nulls not distinct` indexes, so PostgREST's `on_conflict` (column names only) can target them.
  - It sets `city = ''` to `null` first, because the old key treated `''` and `null` as equal and the new one doesn't. The rollup never writes `''`, and under the old key the two could not both exist, so this can't collide.
  - New partial index `analytics_daily_link_id_idx`.
  - New function `analytics_link_view_totals(uuid[])`: `sum(views) … group by link_id`, `stable`, `search_path = ''`. Execute is revoked from `public`, `anon` and `authenticated` and granted to `service_role`.
  - The master is rebuilt as `LATEST_20261018.sql`, and the earlier same-day master moved to `archive/LATEST_20261018.sql`.
- **Link totals:** `sumViewsByLinkIds` calls that RPC, so the ids go in the POST body and the result is one row per link. The link list's view counts are no longer cut off at 1,000 daily rows.
- **Seed:** `supabase/seed/features/v2-analytics.sql` section 5 used the old expression target (`on conflict (pet_id, (coalesce(link_id, …)), …)`). That would no longer match any index, so it now uses `on conflict (pet_id, link_id, channel_key, city, day)`. **Run the seed only after the migration**, or the seed fails with "no unique or exclusion constraint matching".
- **Decision: a new migration, not an edit to the applied ones.** Dev has already applied both migrations that created the indexes, and the CLI won't re-run an edited file.
- **Deploy order:** push the migration first. The old API and rollup code still work on the new schema: the per-row insert falls back to a patch on a unique violation, and the patch filters with `is.null`. The new code needs the migration: `on_conflict` returns 400 without the plain-column index, and the RPC returns 404 without the function.
- **PostHog row limit (found during L5):** PostHog's query API returns only **100 rows** when the HogQL has no `LIMIT` ([docs](https://posthog.com/docs/api/queries)). Neither rollup query had one, so every hourly run stored at most 100 pet rows and 100 owner rows for the whole 14-day window. The seeded dev numbers hid this.
  - Both queries now end with `ORDER BY day DESC LIMIT 50000` (`ROLLUP_ROW_LIMIT`, PostHog's maximum). Newest days come first, so if a run ever hits the limit, the rows left out are from the oldest days, which earlier runs already wrote.
  - The handler logs a warning with both counts when either query returns the full 50,000. There's no alarm until S6.
- **In-memory fakes:** `InMemoryAnalyticsDailyRepository` and `InMemoryAnalyticsOwnerDailyRepository` now sum duplicate keys within one call, like the real repositories. The adders (`addAnalyticsDailyRows`, `addAnalyticsOwnerDailyRows`) moved next to the key functions, so the real repositories and the fakes share them.
- **Tests:** `test/api/repositories/analyticsDailyRepository.test.ts` is rewritten, and `analyticsOwnerDailyRepository.test.ts` is new. They share a new `test/api/support/fakes/RecordingDataAdapter.ts`. The tests check:
  - 50 rows (or 30 for owners) go out in exactly one bulk POST with the right `on_conflict` columns and `Prefer` header.
  - Null link and city are sent as `null`, and `St. Paul & Co` is sent verbatim.
  - Duplicate keys are summed into one row.
  - An empty batch sends nothing, and a failed write throws.
  - Totals come from one `analytics_link_view_totals` RPC, including a bigint that arrives as a string.
  - Against the old implementations, 7 of the 10 new tests fail. The 3 that pass are the empty-batch and no-links guards, which already worked.
  - `test/api/utils/fosterfolioDailyQuery.test.ts` checks that both queries end with `ORDER BY day DESC` / `LIMIT 50000`. The new `test/api/repositories/inMemoryAnalyticsDailyRepositories.test.ts` checks that both fakes sum within a call and overwrite across calls. All of these fail before the change.
  - The new `test/api/analyticsRollup.test.ts` runs the real handler end to end, with only global `fetch` faked: PostHog and Supabase are answered by a small fake backend. It covers:
    - Verified pet and owner rows go out in one bulk upsert per table, and both HogQL queries carry `LIMIT 50000`.
    - Forged and malformed rows are dropped, and the warning holds only the skip counts, never the values.
    - Rows that normalize to the same key (`" Austin "`, an empty owner channel) are summed, not failed.
    - The row-limit warning fires at 50,000.
    - A failed upsert fails the run.
    - With the limit check removed, or with the repository's summing removed, the matching test fails.
- **Verified:**
  - `npm run ci` passes (Jest 46 suites / 371 tests, web unit 59 files / 249 tests, lint, type-check, build).
  - `npm run supabase:push:dry` on dev lists exactly `20261018200000_app_v2_rollup_bulk_upsert.sql`.
  - **On dev**, through PostgREST with the service role, without writing any rows:
    - An empty-array bulk upsert with the new `on_conflict` columns returns 200 on both tables. A control with `on_conflict=pet_id,day` returns `42P10` ("no unique or exclusion constraint matching"), so the empty-array check does exercise index matching.
    - `analytics_link_view_totals` returns `[]` for no ids. For three real links it returns 14 and 26 (and omits the link with no rows), matching sums of the raw rows.
    - No `''` cities are left.
    - The anon key gets `401 permission denied for function analytics_link_view_totals`.
  - The seed's new `on conflict` target has not been run. Dev wasn't re-seeded.
- **Manual steps:**
  1. ✅ **Dev push done** (2026-10-18). `npm run supabase:push` applied `20261018200000_app_v2_rollup_bulk_upsert.sql`, and `supabase:list` shows all five migrations matched on the remote. The arming flag is back at `0`.
  2. **Redeploy both Lambdas.** The rollup Lambda uses the new upsert and the PostHog `LIMIT`, and the API Lambda uses the new link totals. Expect stored numbers to rise after the first rollup run: earlier runs only read 100 rows. Use `infisical run -- npm run deploy:aws`, never a bare `terraform apply`, which blanks `POSTHOG_PERSONAL_API_KEY` (see S1/S4).
  3. **Prod** takes this migration at launch with the other v2 migrations (see "Prod schema at launch").
- **Still open:**
  - **Cross-table atomicity:** pet rows and owner rows are two statements. If the second fails, the tables disagree until the next hourly run rewrites the 14-day window. Both writes are idempotent overwrites, so this heals itself.
  - **One request per table, no chunking.** Chunking would give up all-or-nothing writes. At about 230 bytes a row, a full 50,000-row PostHog result is about 11.5 MB per request. Not tested at that size.
  - **Other capped reads:** the per-pet and per-owner analytics reads and three inquiry reads still stop at 1,000 rows. Moved to **L9**.
  - `analytics_link_view_totals` always reads `analytics_daily`. It ignores the repository's `SUPABASE_ANALYTICS_DAILY_TABLE` override, which nothing sets.
  - Q1 is smaller but not done: the two repositories still mirror each other (`toRecord`, the upsert body), and the key is still defined in three places.
  - `fosterfolio-v2-spec.md` still shows the old `coalesce` index. That's for step 7.

### L6 — Turnstile client behavior · Medium

**Where:** `apps/web/client/features/inquiries/InquiryForm.tsx:239`, `InvisibleTurnstile`

- If the Turnstile script hasn't loaded yet, or is blocked by an ad blocker or privacy extension, `if (!turnstileRef.current) return;` makes **Submit do nothing**, with no error and no spinner.
- Turnstile tokens are single-use. After a server error, `execute()` runs again on an already-solved widget without `turnstile.reset(widgetId)`, so retries can hang or fail.
- No timeout on the `siteverify` call, so a slow Cloudflare response blocks the request until the Lambda times out.

**Fix:** Show an error state when the widget isn't ready, call `reset` before every `execute`, and add an `AbortController` timeout on the server fetch.

**Status: ✅ Fixed** (2026-10-18, not yet committed; the API Lambda needs a redeploy for the timeout)

- **Not ready:** when the site key is set but the widget hasn't mounted (the script is still loading, or a blocker stopped it), Submit now shows "The spam check didn't load. If you use an ad or privacy blocker, allow challenges.cloudflare.com, then try again." The draft stays, and Submit works again once the script loads. One message covers both cases, since the form can't tell a slow script from a blocked one.
- **Challenge failure:** an `error-callback` used to be swallowed (`catch { return; }`). It now shows "We couldn't confirm you're a person. Please try again."
- **Reset:** `execute()` calls `turnstile.reset(widgetId)` before every `turnstile.execute(widgetId)`, so a retry after a challenge error or a server error gets a fresh single-use token. `reset` is added to the `window.turnstile` type.
- **Client timeout:** if no callback arrives within 20 s, the attempt fails with the challenge-failure message instead of hanging.
- **Feedback while verifying:** a `verifying` state disables the fieldset and shows "Sending…" during the challenge, the same as during the request. A second click while busy is ignored. (This covers the first item of the submit-progress nice-to-have below, without the stepper.)
- **Server:** `verifyTurnstileToken` passes `AbortSignal.timeout(5000)` to `siteverify` and treats a timeout or network error as a failed check. The visitor gets `400 INQUIRY_TURNSTILE_FAILED` and can retry, instead of a 500 or a request held until the 15 s Lambda timeout.
- **Decision: fail closed on timeout.** Letting an inquiry through when Cloudflare is slow would make the spam check easy to bypass. A slow `siteverify` is rare, and the visitor can resend.
- **Tests:** the new `test/web/unit/InquiryFormTurnstile.test.tsx` loads the form with a site key and a fake `window.turnstile`. It covers a blocked script, a script that's still loading, a challenge error followed by a successful retry (reset before each execute), a fresh token after a server 500, and a disabled form during the challenge. All 5 fail before the change. The new `test/api/adapters/verifyTurnstileToken.test.ts` covers success/failure/non-200, a hung `siteverify` aborted at the timeout, and a network error. The timeout test didn't compile before the change, and the network-error case threw.
- **Verified:** `npm run ci` passes (Jest 47 suites / 376 tests, web unit 60 files / 254 tests, lint, type-check, build).
- **Not verified in a real browser** against Cloudflare. Test site keys (`1x00000000000000000000AA` always passes, `2x00000000000000000000AB` always fails) can check it by hand.

### L7 — Metric semantics · Low

- **Conversion can exceed 100%.** Inquiries come from Supabase (complete). Views come from PostHog, which ad blockers undercount. With small numbers, 2 inquiries ÷ 1 view = 200%. Cap it, or mark it "≈".
- **`approx_visitors` is effectively equal to `views`.** With `persistence: 'memory'`, every full page load gets a new `person_id`. The rollup then _sums_ `uniq` across city/link/day rows, which overcounts further. The UI never shows it, so the spec's "approx. visitors" label is missing. Either drop the column or define it honestly.
- Inquiries with a null `source_channel_key` (v1 rows, failed attribution) count toward the funnel total but not `byChannel`, so the channel bars don't add up to the stat card.
- All day buckets are UTC. A US-Pacific owner's "today" changes over at 5 pm.

### L8 — Inbox N+1 and duplicated PII · Low

**Where:** `apps/api/application/use-cases/ListNotificationsUseCase.ts:82`

**What:** Each notification triggers up to three sequential lookups: inquiry, then link, then pet. A page of 20 can mean about 60 Supabase round trips from Lambda. The stored `payload` snapshot (sender email, message, zip) is overwritten by the live inquiry anyway. That leaves a second copy of PII that won't follow deletes or edits of the inquiry.

**Fix:** Batch with `id=in.(…)` per entity type. Store only `{ petId }` and the entity ref in the payload, and hydrate everything else at read time.

### L9 — Capped list reads · Medium

Found while fixing L5.

**Where:**

- `AnalyticsDailyRepository.listByPetId` and `AnalyticsOwnerDailyRepository.listByOwnerId`
- `InquiryRepository.listSourcesByPetId` (:98), `listFosterMeSourcesByOwner` (:119) and `countBySourceLinkIds` (:132)

**What:**

- Every one of these reads asks for `limit=10000`, but PostgREST caps responses at `max_rows = 1000` and doesn't say so.
- The two analytics reads sort by `day.asc`. On the "all" range (`sinceDay = null`), a pet or owner with more than 1,000 daily rows (pet × link × channel × city × day) silently loses its **newest** days.
- The inquiry reads only matter past 1,000 inquiries per pet or owner.
- `countBySourceLinkIds` also builds `in.(…)` without `inList` encoding. Its ids come from the database, not from a request.

**Fix:** Add a paging helper that reads `limit=1000&offset=n` until a short page, with a stable order on the key columns, and use it for all five reads. No schema change. Longer term, sum the dashboard numbers in SQL instead of shipping raw rows.

### E1 — Inquiry email isn't live · High

Added 2026-10-19. Before this, it was only a row in the section 4 "Missed" table.

**What:** the SES adapter and the `inquiry_received` email template were done, but the Lambda never got `EMAIL_PROVIDER`, `EMAIL_FROM` or `WEB_ORIGIN`, and its role couldn't call SES. Every deployed inquiry fell back to `LoggingEmailAdapter`, so owners got in-app notifications only. The settings link in the email was a bare `/settings/notifications`. And `dispatch` in `@lattice/notifications` swallows send errors without logging, so a broken SES setup would have failed silently.

**Status: ✅ Fixed** (2026-10-19, not yet committed; needs `infisical run -- npm run deploy:aws` for dev, and for prod at launch)

- **Already in place (checked with the AWS CLI on 2026-10-19):** `fosterfolio.com` is verified in SES in us-east-1 (where both Lambdas run), with DKIM and the custom MAIL FROM (`mail.fosterfolio.com`) passing. The account has SES production access (50,000/day, 14/s), so there's no sandbox request. Bounce and complaint suppression is on account-wide. `@aws-sdk/client-ses` is already in the Lambda bundle.
- **Terraform (dev and prod):**
  - New variables `notification_email_from` (bare address, validated, default null) and `notification_email_from_name` (default "Fosterfolio"). Both local `terraform.tfvars` now set `notification_email_from = "notifications@fosterfolio.com"`. The `.example` files document them.
  - The API Lambda gets `EMAIL_PROVIDER=ses` (`log` when the variable is null), `EMAIL_FROM="Fosterfolio <notifications@fosterfolio.com>"` and `WEB_ORIGIN` (the custom domain, or the CloudFront domain when there isn't one).
  - New `api_lambda_ses_send` policy: `ses:SendEmail` on `identity/fosterfolio.com` only, so the API can't send as any other identity in the account.
  - **The rollup has its own role now** (`analytics_rollup_lambda`): basic execution plus `ssm:GetParameter` on the two Supabase parameters. It no longer inherits the inquiry secrets or SES. That's the IAM half of S6.
- **DMARC:** `modules/ses_smtp` adds `_dmarc.fosterfolio.com` TXT `v=DMARC1; p=none`. It applies with the prod stack, since that's the env with `enable_ses_smtp`. **Decision: report-only, no `rua`.** Reports addressed to Gmail would mostly be dropped (see N2).
- **Logging:** `EmailChannelAdapter` logs `[email] send failed: <error name> (<message>)` and rethrows, so `dispatch` still records `emailed: false`. Addresses in the error message are replaced with `[email]`, because SES quotes them ("…failed the check in region US-EAST-1: a@b.com").
- **Plans:** `terraform validate` passes in both envs.
  - Dev `terraform plan`: 4 to add (rollup role, its attachment and SSM policy, the SES policy), 2 changed in place (both Lambdas), 0 destroyed.
  - Prod `terraform plan`: 8 to add, 3 to change, 0 to destroy. Besides the same items, that's the DMARC record plus S1's 3 throttled routes and stage, which prod hasn't had applied yet.
  - Both plans ran without Infisical, so they also showed `POSTHOG_PERSONAL_API_KEY` changing. `deploy:aws` passes the real key.
- **Tests:** the new `test/api/adapters/emailChannelAdapter.test.ts` checks the pass-through, and that a rejected send is logged with the error name and message, without either address, and rethrown. The logging test fails before the change.
- **Verified:** `npm run ci` passes (Jest 48 suites / 378 tests, web unit 60 files / 254 tests, lint, type-check, build). No real email has been sent yet.
- **Manual steps:**
  1. Deploy dev: `infisical run -- npm run deploy:aws` (dev).
  2. On `dev.fosterfolio.com`, send an inquiry to a pet whose owner's email you can read. Check that the email arrives (not in spam), that Reply goes to the sender, and that the settings link opens `https://dev.fosterfolio.com/settings/notifications`. The notification's `emailed_at` should be set. If it isn't, CloudWatch for the API Lambda has the `[email] send failed` line.
  3. Prod: comes with the launch deploy. The DMARC record goes out then too, unless you apply it earlier on its own.
- **Local dev:** `apps/api/.env.dev` (untracked) has `EMAIL_PROVIDER=ses` with `AWS_REGION=us-west-2`. That region is in the SES sandbox and has no verified identity, so local sends fail, and with this change you'll see the warning. Use `us-east-1` and `EMAIL_FROM=notifications@fosterfolio.com` to send for real locally, or `EMAIL_PROVIDER=log` to only log.

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
- ~~`analytics_stopped_at` is written but never read (see L4).~~ The rollup reads it now (L4).

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
| "Email for every inquiry notification via SES"                                     | Fixed (E1). Needs the deploy.                                                                                                                                                                       |
| Turnstile spam protection                                                          | Code is done. **Not live** (S1).                                                                                                                                                                    |
| "Rollup job keeps the final numbers" on adoption                                   | Fixed (L4)                                                                                                                                                                                          |
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
6. ~~**S5**: Harden email validation.~~ ✅ Done. ~~**L3**: Reserve system channel keys.~~ ✅ Done. ~~**S8**: Bound link text, validate the cursor and the client channel key.~~ ✅ Done (dev migrated; prod at launch). ~~**L5**: One-statement rollup upserts, link totals in SQL.~~ ✅ Done (dev migrated; prod at launch). ~~**L4**: Freeze adopted pets in the rollup.~~ ✅ Done (dev migrated; prod at launch). ~~**L6**: Turnstile client error states, reset, and a `siteverify` timeout.~~ ✅ Done. ~~**E1**: Wire inquiry email (SES) into Terraform, log failed sends, add DMARC.~~ ✅ Done (needs the deploy). ~~**S6**: Rollup role, error alarms, schedule off without PostHog creds.~~ ✅ Done (dev deployed). ~~**S4**: Rotate to a `query:read` key scoped to the project.~~ ✅ Done on dev (SSM move deferred).
7. Update `fosterfolio-v2-spec.md` to reflect 5b, then file L4–L8 and Q1–Q7 as follow-ups.

**Prod schema at launch.** Prod's database is still on the v1 schema. On 2026-10-18 `npm run supabase:list -- --env prod` showed only `20261003120000` applied. When the branch ships, push the v2 schema *before* the API deploy, because the v2 API reads tables v1 doesn't have:

1. `npm run supabase:push:dry -- --env prod` should list exactly `20261008133000_app_v2_tracked_links.sql`, `20261010010000_app_v2_foster_me_links.sql`, `20261018120000_app_v2_link_input_bounds.sql`, `20261018200000_app_v2_rollup_bulk_upsert.sql` and `20261018230000_app_v2_adopted_freeze.sql`, plus any migration added after this note.
2. Set `SUPABASE_PUSH_ENABLED=1` in `supabase/.env.prod`, run `npm run supabase:push -- --env prod`, then set it back to `0`.
3. `npm run supabase:list -- --env prod` should show every local migration with a remote match.

The first three are additive (new tables, nullable or defaulted columns, `if not exists`), and prod has no `tracked_links` rows, so nothing needs a backfill. The L5 migration drops and rebuilds the two analytics unique indexes, but on prod those tables are created empty in the same push. The L4 migration is the one with real work on prod: it backfills `analytics_stopped_at` for v1 pets already marked adopted. Don't run `LATEST_*.sql` on prod. It's for empty databases only.

---

## 7. Second pass (2026-10-19, head `557a142`)

**Scope:** the 19 commits since `b27d7ca` (153 files, +7,170 / −624), plus a sweep of the original v2 surface: route authorization, RLS on the v2 tables, the email template, and the deployed dev and prod state. It also covers the new prod deploy. Checks were read-only: the AWS CLI (Lambda config *names* only, never values, plus logs, SSM metadata, alarms, routes), `supabase:list --env prod`, harmless GETs against both APIs, and the published web bundles in S3.

**Verdict on the new code:** the fixes since the first pass hold up. The rollup verifier, bulk upsert, fail-closed secrets, cursor and email validation, Turnstile reset and timeout, IAM split and alarms all match their write-ups above. Nothing blocks merge. The blocker is the state of prod (P1).

### P1 — Prod already runs v2 code on the v1 schema · Critical (verified)

**What:** on **2026-10-18 at 19:38 EDT** a full `deploy:aws` ran against prod from the working tree, at about `517ec12` ("add turnstyle env validation", committed 19:40). The local prod `terraform.tfstate` (serial 54), the `fosterfolio-prod-web` S3 objects and both prod Lambdas are all stamped 19:38. The prod database still has only `20261003120000` (`supabase:list --env prod`: the five v2 migrations have no remote match).

**Evidence:**

| Check | Prod | Dev |
| --- | --- | --- |
| `GET /pets/<random uuid>` | **500** | 404 `PET_NOT_FOUND` |
| `GET /links/resolve/zzzzzzzz` | **500** | 404 `TRACKED_LINK_NOT_FOUND` |
| API Gateway routes | `ANY /`, `ANY /{proxy+}` only (no S1 throttles) | All 3 public routes present |
| API Lambda env | Has the S1/S2 `*_PARAM` names; no `EMAIL_PROVIDER`, `EMAIL_FROM`, `WEB_ORIGIN` | Full E1 set |
| Rollup Lambda | Shared `api-lambda-role` (pre-S6); PostHog project ID and key **empty**; schedule ENABLED; `Missing required environment variable: POSTHOG_PROJECT_ID` 3×/hour | Own role, creds set, clean runs since 04:25 UTC |
| Alarms | None | Both present; rollup alarm still `ALARM` from the old failures, should clear |

- **Cause of the 500s:** the branch's `PetRepository` `PET_SELECT` includes `analytics_stopped_at`, which only the v2 migration adds. Every pet read (pet pages, profiles, owner lists) fails on v1. Resolve fails because `tracked_links` doesn't exist.
- **Impact so far: none seen.** The prod API logged no requests in 48 hours except the review's own probes.
- **The prod web bundle is v2 too.** It has `ff_source`, foster-me routes and the inbox badge (`unread-count`), and the real Turnstile site key from `apps/web/.env.prod`.

**Fix:** run "Prod schema at launch" (section 6) now, then a full `infisical run -- npm run deploy:aws` for prod. The migrations are additive, so they're safe under the code already deployed. Pushing the schema first fixes the 500s even before the redeploy.

**Status: ✅ Schema fixed** (2026-10-19; the prod redeploy is still pending)

- `supabase:push:dry -- --env prod` listed exactly the five v2 migrations and no seeds. `supabase:push -- --env prod` applied all five. The only warning was the CLI failing to cache its local catalog because Docker wasn't running, which doesn't affect the push. `supabase:list -- --env prod` now shows all six migrations matched, and `SUPABASE_PUSH_ENABLED` is back at `0` in `supabase/.env.prod`.
- **Checked on prod after the push:** `GET /pets/<random uuid>` returns 404, `GET /links/resolve/zzzzzzzz` returns 404, and `GET /users/<owner>/pets` returns 200. That last call had returned 500 on the owner's own refreshes at 05:04 and 05:07 UTC, alongside `GET /me/notifications/unread-count`.
- **Still to do:** the full prod `deploy:aws`. Prod still runs the `517ec12`-era bundle. That means the rollup on the shared role with empty PostHog values (it still fails hourly), no SES, `WEB_ORIGIN` or alarms, and no per-route throttles.

**Prevention (recommended):** add a prod preflight to `scripts/deploy-aws.mjs`. Run `supabase:list --env prod` and stop if any local migration has no remote match. That check would have blocked this deploy.

### R1 — L4 backfill overwrites `pets.updated_at` on prod · Low

**Where:** `supabase/migrations/feature-migrations/20261018230000_app_v2_adopted_freeze.sql`, plus the v1 trigger `pets_touch_updated_at` (`20261003120000_app_v1_schema.sql:287`)

**What:** `update public.pets set analytics_stopped_at = updated_at …` fires the `before update` trigger, which sets `new.updated_at = now()`. `analytics_stopped_at` still gets the *old* `updated_at`, so the freeze date is right. But every adopted v1 pet's `updated_at` becomes the migration time, and its real last-edit time is lost. Neither the web app nor any query uses `pets.updated_at` for display or ordering today, so nobody sees it.

**Status: accepted.** The migration ran on prod unchanged on 2026-10-19 as part of the P1 fix, so the bump has happened. Nothing reads `pets.updated_at` today, so there's nothing to repair.

**Fix (for reference):** before the push this would have been cheap. Wrap the backfill in `alter table public.pets disable trigger pets_touch_updated_at;` … `enable trigger …`. Dev already applied the old text, and the CLI won't re-run it. That drift is harmless: on dev the timestamps already moved. Alternatively, accept the bump.

### R2 — Verifier link lookup isn't paged · Low

`TrackedLinkRepository.listByOwnerIds` chunks 100 owners per request but doesn't page. PostgREST still caps each response at `max_rows = 1000`. Once 100 owners together have more than 1,000 links, the missing links make real rows look like `foreign_link` / `unknown_channel`, and they're dropped. They're logged as "untrusted" counts. This is the L9 problem again. It doesn't matter at beta scale; fix it with L9's paging helper.

### R3 — Missing inquiry secrets take the whole API down · Low (accepted)

`loadApiEnvFromSsm` and `readInquirySecrets` run in bootstrap. If either inquiry parameter is missing or `GetParameter` fails, every route fails, including sign-in and pet pages, not just `POST /inquiries`. This is deliberate (fail closed, same as the Supabase check), and both prod parameters exist (created 2026-10-18 19:12 EDT). The `api-errors` alarm is the only signal, and it isn't on prod until the launch deploy.

### R4 — Freeze day may not be UTC · Low (unverified)

HogQL applies the PostHog project's timezone to `toDate(timestamp)`, as far as I know. `RollupRowVerifier` and the L4 migration compare against the **UTC** day of `analytics_stopped_at`. If the project isn't set to UTC, the adoption-day cutoff can be off by one day, and "UTC days" in L7 is wrong too. Check the project's timezone in PostHog settings: set it to UTC, or document the real one.

### Confirmed working

- CI is green on `557a142` (`test (22.x)`, `web-e2e`, `repo-config`; `terraform` skipped).
- Every new route checks ownership or recipient. `UpdateTrackedLink`, `GetPetAnalytics` and `ListTrackedLinks` compare the owner; notifications are scoped with `findForRecipient`. All v2 tables have RLS with select-only owner policies.
- `NODE_ENV=production` is set on both API Lambdas, so the S1/S2 fail-closed checks are live. Both inquiry SSM parameters exist in dev and prod.
- Dev end to end: real Turnstile site key in the bundle, `POST /inquiries` returned 201 at 2026-10-18 23:35 UTC, CORS preflight returns 204, and the dev SNS subscription is confirmed (not pending).
- **Not exercised anywhere:** SES email. The only deployed inquiry came before the E1 dev deploy (04:06 UTC on 10-19).
- **Not checked fully:** the prod and dev web bundles have different PostHog tokens. Only the first 10 characters were compared visually. Confirm the prod token belongs to the project that will be the prod `POSTHOG_PROJECT_ID`.

### Go / no-go for the private beta

**No-go today, because of P1 only. Go once the following is done:**

1. ~~Fix R1 in the migration.~~ Skipped; it ran as is (accepted).
2. ~~Push the prod schema (section 6).~~ ✅ Done 2026-10-19. Next, the full prod deploy with Infisical.
3. Put the prod PostHog values in Infisical first (`POSTHOG_PROJECT_ID` in `/shared`, a `query:read` key scoped to the project in `/sensitive`, `NEXT_PUBLIC_POSTHOG_TOKEN`). Otherwise the rollup schedule deploys disabled and owners see empty analytics.
4. Do the E1 email smoke test on dev, then send one real inquiry on prod through a foster-me link and a tapped pet.
5. Confirm the prod SNS subscription email. Check that the prod Turnstile widget lists the CloudFront domain and the custom domain.

These stay acceptable for a private beta with known testers: C1, the S4 SSM move, L7–L9, R2–R4 and Q1–Q8. Revisit them before a public launch.

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

### N2 — DMARC reports (`rua`)

**Where:** `infra/terraform/modules/ses_smtp/main.tf` (`aws_route53_record.dmarc`). Added 2026-10-19 with E1.

**Today:** `_dmarc.fosterfolio.com` is `v=DMARC1; p=none` with no `rua`, so nobody receives reports on who sends mail as the domain or whether it passes.

**Why not Gmail:** a report address on another domain only works if that domain publishes `fosterfolio.com._report._dmarc.<their domain>`. Gmail doesn't (checked 2026-10-19), so Google and Microsoft would mostly drop reports sent to a Gmail `rua`. `fosterfolio.com` has no MX, so there's no inbox on the domain either.

**Plan:** sign up for a free report service (for example Postmark's weekly DMARC digest, which emails a readable summary). Add its address as `rua=mailto:…` in the record. After a few weeks of clean reports covering SES notifications and Supabase Auth mail, move `p=none` to `p=quarantine`, then `p=reject`.

