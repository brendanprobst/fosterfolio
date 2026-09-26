# Open TODO — road to private beta

State as of commit `9cd1da2`. Checkpoints 0–6 of the [MVP plan](fosterfolio_mvp.plan.md) are done and the repo-side work for Checkpoint 7 is committed. Items 1 and 2 below are **pre-go-live operator work against live systems** — Supabase SQL and `terraform apply`.

The authoritative runbook is [`docs/playbooks/private-beta.md`](../playbooks/private-beta.md); this file only tracks what is still outstanding and what each item is blocked on.

**Product work is tracked separately.** The site still needs work before go-live matters — see [user handles (vanity URLs)](vanity_urls.plan.md) for the next scoped slice.

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
| CloudFront viewer-request function | `/pets/{uuid}` and `/users/{uuid}` deep links serve the static-export sentinels while the browser URL stays intact. Without it these 404 into the root page. |

Verify afterwards in **Lambda → Configuration → Environment variables**, then walk the browser checklist in [private-beta.md §5](../playbooks/private-beta.md).

## 3. Product work (not blocking, but ahead of go-live)

- **User handles / vanity URLs.** Scoped and researched, not started — see [the plan](vanity_urls.plan.md). A unique `handle` so profiles resolve at `/users/{handle}`, as a full slice from migration to edit dialog. The routes and the CloudFront rewrite already pass arbitrary segments through, so no edge work is needed. Four product questions need answers first (required or optional, renameable, redirects, reserved list).
- **Profile picture editor in a modal.** `AvatarEditor`'s floating panel causes layout shift. The `components/ui/dialog.tsx` primitive now exists and `ProfileEditDialog.tsx` is a working example, so moving the editing state into a dialog is small. The 8 tests in `test/web/unit/AvatarEditor.test.tsx` mostly survive by opening the dialog instead of toggling the panel.
- **Warn before opening a connected-site link.** Not implemented yet — deliberately deferred. `SocialLinksDialog`'s links and the "Connected sites" sidebar card on `/profile` (plus the public profile's own link list) currently open `link.url` directly via a plain `<a target="_blank">`. Since these are user-entered URLs, clicking one should first show a confirmation modal warning that the destination is unverified, with the plain URL rendered underneath the label (not just the label) so the visitor can see exactly where they're headed before continuing.

## 4. First user-demo feedback (2026-09-26)

Raised after a demo with a target-demographic user. Grounded against the current code below; none of these are started.

- **The "(markdown)" label oversells what typing plain text into it does.** Markdown itself isn't missing — `Markdown.tsx` wraps `react-markdown` and already renders `**bold**`, links, etc. on `ProfilePage`, `PublicProfilePage`, and `PetBioPage`. The likely culprit: no `remark-breaks` or `remark-gfm` plugin is installed (checked `apps/web/package.json` — plain `react-markdown@9`), so CommonMark's default behavior collapses a single `\n` inside a paragraph into a space. A foster parent typing several lines into the "Bio (markdown)" textarea (`ProfileEditForm.tsx`, `PetEditor.tsx`) and expecting line breaks would see them run together — reading as "markdown is broken" even though it's spec-correct CommonMark. Fix is cheap: add `remark-breaks` to `Markdown.tsx`.
- **A per-owner bio template with a bracket-delimited insertion point for each pet's own bio.** New concept — nothing like it exists (`bio` on `User` and `bioMarkdown` on `Pet` are fully independent today). Needs a new nullable `bioTemplate` field on `User`, the same shape as the existing `sheltersText` (migration column → `UserProps` → DTOs → `applyProfileUpdate` → `UpdateUserUseCase`), plus a merge step substituting the pet's `bioMarkdown` at the template's single `[...]` marker before rendering. Validate exactly one placeholder when the template is saved. Merge could happen client-side in `PetBioPage.tsx` if `bioTemplate` rides along on `PetOwnerSummaryDto`, or server-side in `GetPetUseCase` once that DTO is touched anyway for vanity handles.
- **Move "shelters you work with" out of the location box, into a subflow of connected sites/links.** `sheltersText` currently lives beside `zipCode` inside `ProfileLocationCard.tsx`, saved through the same partial `PUT`. The field itself (column, entity prop, DTO, `applyProfileUpdate`) doesn't need to move — only where it's surfaced. Move its `Input` and display row into a small dedicated flow reachable from `ConnectedSitesCard.tsx`/`SocialLinksDialog.tsx`, since it's conceptually "another way to find/verify this foster" rather than geography.
- **A profile-level "share" box below the public-profile preview, generating the profile's link as a QR code with visual options.** `PetQrDownload.tsx` is exactly this capability, already built and working for pets (`qrcode`, single PNG download at a fixed 320px/dark-on-light) — this is the same thing one level up, for the user's own public URL, plus exposing the options it hardcodes today (size, colors, margin). Suggest a new `ProfileLinkCard.tsx` in the sidebar, below "Private editor," reusing `PetQrDownload`'s `qrcode` import pattern rather than the pet-specific component itself.
- **The vanity URL should default to the owner's most recent foster, not their profile, with a click-through to the full profile.** The ordering already exists — `PetRepository.findByOwnerId` (`PetRepository.ts`) sorts `created_at.desc`, so "most recent" is just the first element of what `useOwnerPets` already returns; no new query needed. The change is entirely in `PublicProfilePage.tsx`: today it unconditionally renders the profile. It would need to check for pets and, when at least one exists, show that pet's bio instead (reusing `PetBioPage`'s rendering or redirecting to `petBioHref`), with a "View full profile" link back to today's page as the fallback when a foster has no pets. This redefines what a vanity URL points at right as [`vanity_urls.plan.md`](vanity_urls.plan.md) is being designed — worth deciding together rather than sequencing separately.
- **Pets should support multiple photos, not one.** Today a pet has exactly one image: `primaryPhotoUrl` (`primary_photo_url` column, `Pet` entity, `PetWritePayload`). The repo already has precedent for a JSONB array on this same entity — `important_links` — so a `photos jsonb` column following that shape is the natural extension; `primaryPhotoUrl` could stay as the first/cover photo or be derived from it. The upload plumbing (`useMediaUpload`, `POST /storage/sign`) is already per-file and needs no change; `PetEditor.tsx` and `PetBioPage.tsx` are the two places that currently assume a single image.
- **Basic page-view analytics per pet, and maybe per profile.** PostHog is already wired (`apps/web/client/lib/analytics/`, `docs/playbooks/posthog-analytics.md`), but that's third-party event/session analytics with no read path back into the product — it can't power a number shown on `/profile` today. A real "views" count needs its own counter: most likely a small table incremented on `GET /pets/:id` / `GET /users/:id` (mirroring how `profile_stars` already counts something per-user), surfaced as a number or tiny chart in the owner-only view of `PetBioPage.tsx` and somewhere on `/profile`. No existing seam covers this — it's new end-to-end work, not a wiring change.
- **Stretch, post-MVP — a bookmark/add-to-home-screen CTA on pet bio pages.** Nothing to build on yet: no `manifest.json` or install-prompt handling exists in `apps/web` today. Browser support is uneven — the `beforeinstallprompt` event Chrome/Android uses has no equivalent on iOS Safari, which only offers a manual "Add to Home Screen" via the share sheet, so the CTA would need to degrade to an instructional prompt there.
- **Stretch, post-MVP — a resources section (unlisted YouTube videos) for new foster parents.** No existing embed component or resources route. No architectural blocker; scopes cleanly later as a new `client/pages/resources/` page wrapping `<iframe>` embeds.

## 5. Loose ends

- **Run the rewritten auth-guard E2E spec.** `test/web/e2e/auth-guard.spec.ts` was retargeted from the deleted `/things` to `/profile` and has not been executed. It needs ports 3000 and 3001 free — Playwright starts its own stack with a synthetic session rather than reusing a `npm run dev` pointed at real Supabase. Stop the dev server, then `npx playwright test --config test/web/playwright.config.ts auth-guard`.
- **Decide on `zustand`.** Still in `apps/web/package.json` but with no consumers since `thingsStore.ts` was deleted. Kept for now because it is part of the documented state stack in [`apps/web/client/stores/AGENTS.md`](../../apps/web/client/stores/AGENTS.md); drop it if no screen needs client UI state.

---

## Related

- [Private beta playbook](../playbooks/private-beta.md) — the operator runbook for items 1 and 2
- [User handles (vanity URLs)](vanity_urls.plan.md) — the handles slice in item 3
- [Fosterfolio MVP plan](fosterfolio_mvp.plan.md) — checkpoint status and scope boundary
- [Development seed data](../playbooks/dev-seed-data.md) — `npm run supabase:seed` for a populated dev project
- [Deploy to AWS](../deploy-aws.md) — what `npm run deploy:aws` actually does
