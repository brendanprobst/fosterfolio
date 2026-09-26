# Open TODO — road to private beta

State as of commit `7a63a84` (Things scaffold removed). Checkpoints 0–6 of the [MVP plan](fosterfolio_mvp.plan.md) are done and the repo-side work for Checkpoint 7 is committed. **Everything below is operator work against live systems** — Supabase SQL and `terraform apply` — plus two small cleanups.

The authoritative runbook is [`docs/playbooks/private-beta.md`](../playbooks/private-beta.md); this file only tracks what is still outstanding and what each item is blocked on.

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

## 3. Loose ends

- **Run the rewritten auth-guard E2E spec.** `test/web/e2e/auth-guard.spec.ts` was retargeted from the deleted `/things` to `/profile` and has not been executed. It needs ports 3000 and 3001 free — Playwright starts its own stack with a synthetic session rather than reusing a `npm run dev` pointed at real Supabase. Stop the dev server, then `npx playwright test --config test/web/playwright.config.ts auth-guard`.
- **Decide on `zustand`.** Still in `apps/web/package.json` but with no consumers since `thingsStore.ts` was deleted. Kept for now because it is part of the documented state stack in [`apps/web/client/stores/AGENTS.md`](../../apps/web/client/stores/AGENTS.md); drop it if no screen needs client UI state.

---

## Related

- [Private beta playbook](../playbooks/private-beta.md) — the operator runbook for items 1 and 2
- [Fosterfolio MVP plan](fosterfolio_mvp.plan.md) — checkpoint status and scope boundary
- [Development seed data](../playbooks/dev-seed-data.md) — `npm run supabase:seed` for a populated dev project
- [Deploy to AWS](../deploy-aws.md) — what `npm run deploy:aws` actually does
