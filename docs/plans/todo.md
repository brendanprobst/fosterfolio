# Open TODO — road to private beta

State as of commit `9cd1da2`. Checkpoints 0–6 of the [MVP plan](fosterfolio_mvp.plan.md) are done and the repo-side work for Checkpoint 7 is committed. Items 1 and 2 below are **pre-go-live operator work against live systems** — Supabase SQL and `terraform apply`.

The authoritative runbook is [`docs/playbooks/private-beta.md`](../playbooks/private-beta.md); this file only tracks what is still outstanding and what each item is blocked on.

**Product work is tracked separately.** Next coding session is [§6](#6-next-session--last-product-slice-before-pre-deploy-2026-09-30) (pet editor page + multi-photo, inquiry submit + UX, flag off feed/search, `/` as an info page). After that, go-live is mostly items 1–2. Older product nits remain in §3–4. See [user handles (vanity URLs)](vanity_urls.plan.md) for that already-shipped slice.

---

## 1. Private beta allowlist (Supabase)

Two independent gates have to be on. The **DB trigger** blocks new `auth.users` inserts; the **Lambda** `EMAIL_ALLOWLIST_ENABLED` flag blocks authenticated API calls. Turning on only one leaves a hole — an already-registered non-tester could still call the API, or an allowlisted tester could be unable to sign up.

**Blocked on:** the list of emails to admit (operator address plus testers).

The DB half, from [private-beta.md §1](../playbooks/private-beta.md):

```sql
select public.set_allowlist_enabled(true);

insert into public.allowed_emails (email, note)
values
  ('you@example.com', 'operator'),
  ('tester@example.com', 'beta')
on conflict (email) do nothing;
```

Check current state before and after:

```sql
select enabled from public.allowlist_settings where singleton = true;
select email, note from public.allowed_emails order by created_at;
```

This can run through the Supabase Management API using the same credentials as `npm run supabase:seed` (`supabase/.env.local`), so it does not need `psql`. The Lambda half needs no separate action — `email_allowlist_enabled` already defaults to `true` in Terraform and ships with item 2.

Background and rollback: [`docs/playbooks/email-allowlist.md`](../playbooks/email-allowlist.md).

## 2. AWS deploy

**Blocked on:** `infra/terraform/envs/dev/terraform.tfvars`, which is gitignored and does not exist yet. Copy `terraform.tfvars.example` and fill in the real Supabase URL and service role key, keeping:

```hcl
manage_supabase_credentials_in_ssm = true
email_allowlist_enabled            = true
```

Then, with AWS credentials that can apply the stack:

```bash
npm run deploy:aws -- --plan-only     # review first
npm run deploy:aws -- --auto-approve
```

Three things depend on this apply:

| Piece | Why it matters |
|---|---|
| SSM `/{project}-{env}/supabase/*` | Lambda reads `SUPABASE_URL` and the service role key at boot (`apps/api/lambda.ts`) |
| `EMAIL_ALLOWLIST_ENABLED=true` on the Lambda | The API gate that pairs with the DB trigger in item 1 |
| CloudFront viewer-request function | `/@handle`, `/@handle/foster-me`, and `/@handle/pet/{id}` deep links serve the static-export sentinels while the browser URL stays intact. Without it these 404 into the root page. |

Verify afterwards in **Lambda → Configuration → Environment variables**, then walk the browser checklist in [private-beta.md §5](../playbooks/private-beta.md).

## 3. Product work (not blocking, but ahead of go-live)

- **User handles / vanity URLs.** Implemented — see [the plan](vanity_urls.plan.md). Unique `handle` on `public.users`, API lookup by id or handle, and a root-level `/@handle` route family (profile, `/foster-me`, `/pet/{id}`) replacing `/users/{id}` and `/pets/{id}`. CloudFront now rewrites the `@` prefix family; a new `terraform apply` is still required before those URLs work on the live distribution.
- **Warn before opening a connected-site link.** Not implemented yet — deliberately deferred. `SocialLinksDialog`'s links and the "Where you share" card on `/profile` (plus the public profile's own link list) currently open `link.url` directly via a plain `<a target="_blank">`. Since these are user-entered URLs, clicking one should first show a confirmation modal warning that the destination is unverified, with the plain URL rendered underneath the label (not just the label) so the visitor can see exactly where they're headed before continuing.
- **Header light/dark switcher.** Decided 2026-09-26: a control in `AppHeader` that lets the visitor pick light or dark. Not a Lattice env flag — `latticeFeatureFlags.ts` only has `isLatticeE2eEnabled()` (`NEXT_PUBLIC_LATTICE_E2E`) and is the wrong seam for a per-user preference. The tokens are already painted: `globals.css` defines `:root` and `.dark` palettes, Tailwind's `@custom-variant dark (&:is(.dark *))` is wired, and [`apps/web/docs/ui-and-styling.md`](../../apps/web/docs/ui-and-styling.md) already says to toggle by putting class `dark` on `<html>`. Nothing does that today — `app/layout.tsx` renders a plain `<html lang="en">`, `app/providers.tsx` has no theme provider, and `next-themes` is not in `apps/web/package.json`. Suggested slice: add `next-themes`, wrap the tree in `ThemeProvider` (`attribute="class"`, `defaultTheme="light"`, persist to `localStorage`), put `suppressHydrationWarning` on `<html>` (already on `<body>`), and drop a compact toggle in `AppHeader`'s right-side cluster next to Sign in / Sign out. Every product page already goes through `AppShell` → `AppHeader` (home, search, profile, public profile, pet bio), so one control covers them; auth pages do not use the shell, which is fine — the stored preference still applies once they land on a shelled page. Keep it two-state (light / dark), not a third "system" option, unless that gets asked for. No `Switch` primitive exists yet — either `npx shadcn@latest add switch` or an icon `Button` (`Sun` / `Moon` from lucide). Static export (`output: "export"`) is compatible as long as the provider is client-only. Leave `PetQrDownload`'s hardcoded `#111` / `#fff` alone — those are the PNG, not the page theme. Verify `/ui` plus one product page in both modes; do not hard-code colors in the new control.

## 4. First user-demo feedback (2026-09-26)

Raised after a demo with a target-demographic user. Grounded against the current code below; none of these are started.

- ~~**The "(markdown)" label oversells what typing plain text into it does.**~~ **Done 2026-09-30.** `Markdown.tsx` now uses `remark-breaks` so a single newline in a bio or post renders as a line break.
- **A per-owner bio template with a bracket-delimited insertion point for each pet's own bio.** New concept — nothing like it exists (`bio` on `User` and `bioMarkdown` on `Pet` are fully independent today). Needs a new nullable `bioTemplate` field on `User`, the same shape as the existing `sheltersText` (migration column → `UserProps` → DTOs → `applyProfileUpdate` → `UpdateUserUseCase`), plus a merge step substituting the pet's `bioMarkdown` at the template's single `[...]` marker before rendering. Validate exactly one placeholder when the template is saved. Merge could happen client-side in `PetBioPage.tsx` if `bioTemplate` rides along on `PetOwnerSummaryDto`, or server-side in `GetPetUseCase` once that DTO is touched anyway for vanity handles.
- ~~**Move "shelters you work with" out of the location box, into a subflow of connected sites/links.**~~ **Superseded 2026-09-28.** Shelters stay with ZIP on `ProfileLocationCard`. Multiple shelters are `{ name, url }[]` JSON stored in the existing `shelters_text` column (`parseShelterLinks` / `serializeShelterLinks`). "Where you share" (`social_links`) is only for places the foster posts about their animals.
- **Promote shelter links off `shelters_text` JSON into their own table.** Today `public.users.shelters_text` is still a `text` column; the web app writes a JSON array of `{ name, url }` into it (legacy plain-name strings still parse as a single row). That is enough for multiple shelters without a migration. A real `user_shelters` (or similar) table should come later: one row per shelter, FK to `users`, typed `url`, so we can query, validate, and join without `JSON.parse`. Until then do not add a CHECK constraint or jsonb column — keep the text-column contract the API already has (`sheltersText: string | null`).
- **A profile-level "share" box below the public-profile preview, generating the profile's link as a QR code with visual options.** `PetQrDownload.tsx` is exactly this capability, already built and working for pets (`qrcode`, single PNG download at a fixed 320px/dark-on-light) — this is the same thing one level up, for the user's own public URL, plus exposing the options it hardcodes today (size, colors, margin). Suggest a new `ProfileLinkCard.tsx` in the sidebar, below "Private editor," reusing `PetQrDownload`'s `qrcode` import pattern rather than the pet-specific component itself.
- ~~The vanity URL should default to the owner's most recent foster, not their profile~~ — **resolved, superseded by [`vanity_urls.plan.md`](vanity_urls.plan.md).** Rather than changing what the root vanity URL points at, the root stays the profile and gets a dedicated sibling, `/@handle/foster-me`, for this exact use case. See that plan for the selection rule (still a defaulted, not fully confirmed, decision) and why it must not redirect to a fixed pet permalink.
- **Pets should support multiple photos, not one.** — **In beta / next session (item 6.1).** Today a pet has exactly one image: `primaryPhotoUrl`. Precedent: `important_links` JSONB on the same entity. `photos jsonb` + keep `primaryPhotoUrl` as cover (first photo). Upload plumbing (`useMediaUpload`, `POST /storage/sign`) is already per-file.
- **Basic page-view analytics per pet, and maybe per profile.** PostHog is already wired (`apps/web/client/lib/analytics/`, `docs/playbooks/posthog-analytics.md`), but that's third-party event/session analytics with no read path back into the product — it can't power a number shown on `/profile` today. A real "views" count needs its own counter: most likely a small table incremented on `GET /pets/:id` / `GET /users/:id` (mirroring how `profile_stars` already counts something per-user), surfaced as a number or tiny chart in the owner-only view of `PetBioPage.tsx` and somewhere on `/profile`. No existing seam covers this — it's new end-to-end work, not a wiring change.
- **Stretch, post-MVP — a bookmark/add-to-home-screen CTA on pet bio pages.** Nothing to build on yet: no `manifest.json` or install-prompt handling exists in `apps/web` today. Browser support is uneven — the `beforeinstallprompt` event Chrome/Android uses has no equivalent on iOS Safari, which only offers a manual "Add to Home Screen" via the share sheet, so the CTA would need to degrade to an instructional prompt there.
- **Stretch, post-MVP — a resources section (unlisted YouTube videos) for new foster parents.** No existing embed component or resources route. No architectural blocker; scopes cleanly later as a new `client/pages/resources/` page wrapping `<iframe>` embeds.

## 5. Loose ends

- **Run the rewritten auth-guard E2E spec.** `test/web/e2e/auth-guard.spec.ts` was retargeted from the deleted `/things` to `/profile` and has not been executed. It needs ports 3000 and 3001 free — Playwright starts its own stack with a synthetic session rather than reusing a `npm run dev` pointed at real Supabase. Stop the dev server, then `npx playwright test --config test/web/playwright.config.ts auth-guard`.
- **Decide on `zustand`.** Still in `apps/web/package.json` but with no consumers since `thingsStore.ts` was deleted. Kept for now because it is part of the documented state stack in [`apps/web/client/stores/AGENTS.md`](../../apps/web/client/stores/AGENTS.md); drop it if no screen needs client UI state.
- **Investigate Supabase Advisor: "Clients can list all files in this bucket."** The warning is about `fosterfolio_media_public_read` on `storage.objects` in [`supabase/migrations/20260804031454_app_create_core_schema.sql`](../../supabase/migrations/20260804031454_app_create_core_schema.sql) — `FOR SELECT USING (bucket_id = 'fosterfolio-media')` with no path restriction. The bucket is already `public = true`, so individual objects are reachable by known URL without that policy; SELECT on `storage.objects` is what lets an anon client *list* every object via the Storage/PostgREST API. Checkpoint 4 tried to blunt enumeration by giving uploaded filenames a random suffix ([MVP plan](fosterfolio_mvp.plan.md) §4), but listing still exposes the full set. Likely fix is drop the public SELECT (or restrict it to `auth.uid()`'s folder) and confirm browsers still load `<img src="{publicUrl}">` from the public bucket. Writes already require own-folder; `user_storage_bytes` is `security definer` and granted only to `service_role`, so it should keep working. Verify in the dashboard after a new migration, and check that seed/dev picsum URLs (not storage objects) are unaffected.
- ~~add a "visible only to you" label to info cards on pubic facing pages for content only rendered to a user~~ **Done 2026-09-30.** `OwnerOnlyLabel` on owner-only chrome: public-profile sidebar, pet-bio edit card, and `ShareLinkCard` (foster-me preview + pet-bio share).
- be able to edit a pet's bio from their page, or the foster me page, may involve navigating, but the flow should have a valid starting path from both those pages — **pull into next session** (item 6.1); do not treat as a separate later chore.

---

## 6. Next session — last product slice before pre-deploy (2026-09-30)

Do these, in this order, **before** items 1–2 (allowlist + AWS). Do not start the code until that session. After they land, the remaining work is mostly operator/deploy (plus leftover product nits in §3–4 that are not required for a private-beta cut).

### 6.1 Pet bio edit UX

Today add/edit is a single wide `PetEditorDialog` wrapping a long `PetEditor` form. Owner entry is `/profile` only. Pet bio and foster-me still have no “edit this pet” path (see the last bullet in §5).

**Decided 2026-09-30:** one big form is fine — no tabs or steps yet. Move it off the dialog onto **its own page** (product “edit in Dialog” rule does not apply here; pet editor is the exception). `/profile` “Add pet” / “Edit” and owner-only controls on `PetBioPage` + `FosterMePage` should navigate to that page (create vs edit routes), then back to where the user started.

**Do:**
- Dedicated route(s), e.g. `/profile/pets/new` and `/profile/pets/[petId]/edit` (or equivalent). Reuse `PetEditor` as the page body, not `PetEditorDialog`.
- Keep the current single-scroll form. Light grouping/labels are ok; no wizard.
- **Multiple photos in the beta:** `photos jsonb` on `pets` (same idea as `important_links`); `primaryPhotoUrl` stays the cover / first. Editor: add/remove/reorder uploads on that one page. Pet bio (and cards) show a small gallery, cover first. Existing single-URL pets migrate as a one-item array.
- Verify: create, edit, multi-upload, delete, and all three entry points. Desktop + a narrow viewport.

### 6.2 Inquiry form — actually submit it, then buff UX

`InquiryForm` / `ExpandableInquiryForm` already POST via `useCreateInquiryMutation`. Success is an `Alert` (“Inquiry sent”). Failures surface the mutation error. Email is the logging adapter unless SES is wired.

**Do:**
- Guest-submit from public profile, pet bio (with `targetPetId`), and foster-me. Confirm the foster’s inbox (or API/server logs if email is still the logger). Cover empty fields, bad email, and double-submit.
- Then UX: clearer pending/disabled Save, keep the draft on error, success copy that names the foster when we have `displayName`, maybe collapse the expandable form after send. No captcha. No extra per-IP/email limiter — API Gateway stage throttling (`api_gateway_throttling_rate_limit` / burst, already in Terraform) is enough for private beta.
- Tests: extend `InquiryForm.test.tsx` and the product e2e that already fills the dialog on pet bio; add a public-profile submit if missing.

### 6.3 Hide feed and search behind product flags (do not delete); `/` becomes the info page

`HomePage` (today `/`) and `SearchPage` (`/search`) stay in the repo. `AppHeader` always links Home + Search. Foster-me empty copy links `/search`.

**Decided 2026-09-30:** new `/` is an **info page** explaining what Fosterfolio is (not a stub, not a redirect to `/profile`). Logo/Home can keep pointing at `/`. Move the chronological feed off `/` (e.g. `/feed`) so it can sit behind a flag.

**Do not** use `config/repo-features.json` (CI/Dependabot only) and **do not** name product flags `LATTICE`. New helpers, e.g. `isFosterfolioFeedEnabled()` / `isFosterfolioSearchEnabled()`, reading `NEXT_PUBLIC_FOSTERFOLIO_FEED` / `NEXT_PUBLIC_FOSTERFOLIO_SEARCH`, **default off** for beta. Keep `NEXT_PUBLIC_LATTICE_E2E` as-is (Playwright/Lattice). When flags are off: hide Search (and Feed, if you add a nav item) from the header and other in-product links; `/search` and `/feed` can 404 or show a short “not in this beta” shell. Gate unit/e2e that assume the feed. API list/search endpoints stay; this is a web chrome cut.

### After 6.x

Pre-deploy prep = item 2 (`terraform.tfvars` + `deploy:aws`) and item 1 (allowlist emails), then the browser checklist in [private-beta.md §5](../playbooks/private-beta.md). Still later, not this slice: connected-site warning modal, theme switcher, view counts, `user_shelters` table.

---

## Related

- [Private beta playbook](../playbooks/private-beta.md) — the operator runbook for items 1 and 2
- [User handles (vanity URLs)](vanity_urls.plan.md) — the handles slice in item 3
- [Fosterfolio MVP plan](fosterfolio_mvp.plan.md) — checkpoint status and scope boundary
- [Development seed data](../playbooks/dev-seed-data.md) — `npm run supabase:seed` for a populated dev project
- [Deploy to AWS](../deploy-aws.md) — what `npm run deploy:aws` actually does
