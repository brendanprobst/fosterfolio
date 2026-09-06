# Private beta (Checkpoint 7)

Fosterfolio launches as a **private beta**: authenticated writes are allowlisted, SES stays in sandbox / `EMAIL_PROVIDER=log`, and `/pets/{uuid}` plus `/users/{uuid}` deep links need the CloudFront viewer-request rewrite applied.

This playbook is the operator half. Repo-side pieces (Playwright product specs, `npm run smoke`, Terraform default `email_allowlist_enabled = true`, SSM parameter names on the API Lambda) ship in git. **`terraform apply` and the Supabase SQL below change live systems** — run them from a machine with AWS + Supabase credentials when you are ready.

## 1. Supabase allowlist (signup + tester emails)

Both layers must be on. The DB trigger blocks **new** `auth.users` inserts; Lambda `EMAIL_ALLOWLIST_ENABLED` blocks **authenticated API** calls.

```sql
select public.set_allowlist_enabled(true);

insert into public.allowed_emails (email, note)
values
  ('you@example.com', 'operator'),
  ('tester@example.com', 'beta')
on conflict (email) do nothing;
```

Confirm:

```sql
select enabled from public.allowlist_settings where singleton = true;
select email, note from public.allowed_emails order by created_at;
```

Details and rollback: [`email-allowlist.md`](email-allowlist.md).

## 2. Terraform / SSM / CloudFront

`infra/terraform/envs/dev/terraform.tfvars` (gitignored) should include real Supabase URL/keys and:

```hcl
manage_supabase_credentials_in_ssm = true
email_allowlist_enabled            = true
```

Then from the repo root, with AWS credentials that can apply this stack:

```bash
npm run deploy:aws -- --plan-only   # review first
npm run deploy:aws -- --auto-approve
```

What apply does that beta depends on:

| Piece | Why |
|---|---|
| SSM `/{project}-{env}/supabase/*` | Lambda reads `SUPABASE_URL` / service role at boot (`apps/api/lambda.ts`) |
| `EMAIL_ALLOWLIST_ENABLED=true` on the API Lambda | API gate matches the DB flag |
| CloudFront function | `/pets/{uuid}` and `/users/{uuid}` serve the static-export sentinels while the browser URL stays intact |

Confirm after apply: **Lambda → Configuration → Environment variables** shows `EMAIL_ALLOWLIST_ENABLED=true`, `SUPABASE_URL_PARAM`, and `SUPABASE_SERVICE_ROLE_KEY_PARAM`.

Do **not** commit `terraform.tfvars` or `.env` files.

## 3. Local / CI product smoke (no AWS)

Playwright starts in-memory API + Next with a synthetic JWT and `LATTICE_E2E=1` (seeds Alex / Mochi). `next dev` omits `output: "export"` so `/pets/{uuid}` and `/users/{uuid}` resolve without CloudFront; `next build` still exports the sentinel pages.

```bash
npx playwright install chromium   # once
npm run test:web:e2e
```

Specs: `test/web/e2e/product.spec.ts` (feed, search, pet bio, public profile, inquiry, profile editor), plus auth-guard / home / gallery.

## 4. Deployed API smoke

```bash
API_BASE_URL=https://YOUR_API_HOST npm run smoke
# optional deep links once you have real ids:
# SMOKE_PET_ID=… SMOKE_USER_ID=… npm run smoke
```

The script only prints `status path`. It does not log tokens.

## 5. Browser checklist against CloudFront

1. `/` feed loads.
2. `/search?q=` finds a known pet or foster.
3. `/pets/{uuid}` (paste a real id, not `?id=`) shows bio, QR, inquiry.
4. `/users/{uuid}` shows the public profile + star.
5. Sign in with an **allowlisted** email; `/profile` edits and can create a pet.
6. Sign-up with an email **not** on the list shows the approved-access message.

Local `next dev` serves `[id]` directly; CloudFront is what needs the rewrite apply from §2.
