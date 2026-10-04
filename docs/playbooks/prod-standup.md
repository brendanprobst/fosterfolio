# Prod standup (Fosterfolio)

Checklist for critical infra: a new Supabase project and `infra/terraform/envs/prod`, serving `https://fosterfolio.com`. Dev stays on the current Supabase project and `dev.fosterfolio.com`.

## Decisions

- **Schema is one migration, not a copy of dev.** `npm run supabase:push` applies `supabase/migrations/20261003120000_app_v1_schema.sql` to an empty prod project. Do not push that file at the current dev project until dev is dropped and re-seeded; its migration history still names the four files this one replaced. Do not `pg_dump` / restore the dev database. A dump would carry seed users (`@seed.fosterfolio.test`), auth identities, and storage paths that do not exist in the prod bucket. Sign up again on prod with an allowlisted email. Source: [Supabase migrations](supabase-migrations.md), [Development seed data](dev-seed-data.md).
- **Google SSO is out of this go-live.** Email and password is enough for the closed beta. Add Google on the prod project later. Source: [Google SSO](google-sso.md). The Google button stays hidden unless `NEXT_PUBLIC_GOOGLE_SSO=1` (section 7). Prod leaves it at `0`.
- **Deploys stay on the CLI.** `npm run deploy:aws -- --env <env>` selects `infra/terraform/envs/<env>` (default `dev`). `--skip-web` updates the Lambda and leaves the site alone. `npm run deploy:aws:web -- --env <env>` uploads the site and leaves Terraform alone. Source: [Deploy to AWS](../deploy-aws.md).

Squarespace nameservers already point at the dev-owned zone `Z086583512U74ZET8C9T8`. Prod only adds records in that zone. Leave the dev tfvars in create-zone mode.

Do the Terraform apply on a stable network. A hotel resolver has dropped AWS API lookups mid-apply.

Each step starts with `Progress:` set to `not started`, `in progress`, or `done`. Update that line when the step changes.

## Already done

Progress: done

- [x] v1 schema is `supabase/migrations/20261003120000_app_v1_schema.sql`. The four older migration files are gone. Pushing it is still step 2, and only against an empty project.
- [x] `NEXT_PUBLIC_GOOGLE_SSO=1` is the only value that shows **Continue with Google**. Unset or `0` hides it. Prod is set to `0`.

---



## 1. Create the prod Supabase project

Progress: not started

Source: [Supabase migrations](supabase-migrations.md).

- [x] In the [Supabase dashboard](https://supabase.com/dashboard), **New project**. Name it so it is obviously prod (for example `fosterfolio-prod`). Pick a region and save the database password.
- [x] Open **Project Settings → API**. Copy the project URL, the `anon` key, and the `service_role` key into a scratch note. These go in Terraform and `apps/web/.env.prod`, not into the dev files (`apps/api/.env`, `apps/api/.env.dev`, or `apps/web/.env.local`).
- [x] Open **Connect** and copy the **Session pooler** URI (port **5432**, user `postgres.<project-ref>`). That is `SUPABASE_DB_URL`. Do not use the transaction pooler (port **6543**).



## 2. Push schema to that project

Progress: not started

Source: [Supabase migrations](supabase-migrations.md). A command with no `--env` reads the dev file (`supabase/.env.dev`, then `.env.local`, then `.env`). `--env prod` reads only `supabase/.env.prod`. This is the net-new migration. It creates empty tables. It does not copy rows.

- [x] Create `supabase/.env.prod` (gitignored). Copy `SUPABASE_ACCESS_TOKEN` from the dev file (it is your account token, not the project). Set `SUPABASE_PROJECT_REF` to the new ref. Set `SUPABASE_DB_URL` to the session-pooler URI from step 1. URL-encode special characters in the password. Leave the dev file untouched.
- [x] Dry-run, then push the v1 schema:

```bash
npm run supabase:push:dry -- --env prod
npm run supabase:push -- --env prod
npm run supabase:list -- --env prod
```

- [ ] Do not run `npm run supabase:seed`. That command refuses `--env prod`.



## 3. Turn on the email allowlist

Progress: not started

Source: [Email allowlist](email-allowlist.md), [Private beta](private-beta.md) §1.

Do this in the **prod** project: dashboard → **SQL Editor** → New query. Run one statement at a time.

- [ ] Enable the signup trigger:

```sql
select public.set_allowlist_enabled(true);
```

- [x] Insert the operator and tester emails (one row per person). These are new rows, not a sync from dev:

```sql
insert into public.allowed_emails (email, note)
values
  ('you@example.com', 'operator')
on conflict (email) do nothing;
```

- [x] Confirm both gates:

```sql
select enabled from public.allowlist_settings where singleton = true;
select email, note from public.allowed_emails order by created_at;
```

`enabled` must be `true`. If the trigger is missing, `npm run supabase:push` did not apply `20261003120000_app_v1_schema.sql`. Re-check step 2 before continuing. The API half of the gate is `email_allowlist_enabled = true` in the prod tfvars (step 4).

## 4. Copy the Terraform root

Progress: not started

Source: [Deploy to AWS](../deploy-aws.md), [Route 53 custom domain](route53-custom-domain.md) (path B: zone already exists).

- [x] Copy the dev stack without its state or `.terraform` directory:

```bash
mkdir -p infra/terraform/envs/prod
cp infra/terraform/envs/dev/*.tf \
   infra/terraform/envs/dev/.terraform.lock.hcl \
   infra/terraform/envs/dev/terraform.tfvars.example \
   infra/terraform/envs/prod/
cp infra/terraform/envs/dev/terraform.tfvars infra/terraform/envs/prod/terraform.tfvars
```

- [x] Edit `infra/terraform/envs/prod/terraform.tfvars` (gitignored):

```hcl
environment = "prod"

supabase_url              = "https://<prod-project-ref>.supabase.co"
supabase_anon_key         = "<prod anon key>"
supabase_service_role_key = "<prod service role key>"

manage_supabase_credentials_in_ssm = true
email_allowlist_enabled            = true

web_custom_domain          = "fosterfolio.com"
create_route53_hosted_zone = false
route53_hosted_zone_id     = "Z086583512U74ZET8C9T8"
```

Comment out `route53_zone_name` if it was copied. Do not set `create_route53_hosted_zone = true`. That would create a second zone for `fosterfolio.com`.

- [x] Leave the dev env files on the dev project (`apps/api/.env`, `apps/api/.env.dev`, `apps/web/.env.local`).
- [x] Create `apps/web/.env.prod` (gitignored). Leave feed and search unset so they stay off. The service role key does not belong in this file. The deploy reads every variable in this file, including `NEXT_PUBLIC_GOOGLE_SSO`.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<prod-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<prod anon key>
```



## 5. Apply prod infra locally

Progress: not started

Source: [Deploy to AWS](../deploy-aws.md).

`--skip-web` still builds the Lambda zip and runs Terraform. It does not build or upload the static site. The site upload is section 8. Later API-only releases are the same `--skip-web` command. Later site-only releases are `npm run deploy:aws:web -- --env prod`.

- [x] Review the plan. It should be creates only (Lambda, API Gateway, S3, CloudFront, an ACM cert for `fosterfolio.com`, an alias A record in zone `Z086583512U74ZET8C9T8`). It must not destroy the dev stack or the hosted zone.

```bash
npm run deploy:aws -- --env prod --plan-only
```

- [ ] Apply infra only:

```bash
npm run deploy:aws -- --env prod --skip-web
```

- [ ] If apply sits on `aws_acm_certificate_validation`, check that public DNS still answers from Route 53:

```bash
dig +short NS fosterfolio.com @8.8.8.8
```

Expect `ns-1870.awsdns-41.co.uk`, `ns-601.awsdns-11.net`, `ns-1531.awsdns-63.org`, and `ns-291.awsdns-36.com`. A `no such host` error for `*.amazonaws.com` is your network DNS, not the certificate. Stop, switch networks, and run the same command again. The cert and zone survive a killed apply.

- [x] From `infra/terraform/envs/prod`, confirm the public URL an save the API URL for the smoke check:

```bash
terraform output -raw web_public_base_url
terraform output -raw api_url
```

`web_public_base_url` should be `https://fosterfolio.com`.

## 6. Prod auth URLs (email and password only)

Progress: not started

Source: [Google SSO](google-sso.md) §3, for the redirect list. Password reset sends people to `https://fosterfolio.com/auth/reset-password`. Skip **Authentication → Providers → Google**.

This is the **prod** Supabase project. Do not change the dev project's Site URL.

- [x] **Authentication** → **URL Configuration**.
- [x] **Site URL:** `https://fosterfolio.com`
- [x] **Redirect URLs:** add `https://fosterfolio.com/`**. You do not need `localhost` on this project.



## 7. Hide SSO buttons in the prod bundle

Progress: done

`isGoogleSsoEnabled()` is already in the app. The button renders only when `NEXT_PUBLIC_GOOGLE_SSO` is exactly `1`. The static build bakes that value in.

- [x] Flag implemented. `apps/web/.env.local` and `apps/web/.env.prod` both set `NEXT_PUBLIC_GOOGLE_SSO=0`, so the Google button stays hidden.



## 8. Upload the site, then check it

Progress: not started

Source: [Deploy to AWS](../deploy-aws.md). This build reads `apps/web/.env.prod` and the prod Terraform outputs. It does not read `apps/web/.env.local`.

- [x] Upload:

```bash
npm run deploy:aws:web -- --env prod
```

Source for the checks: [Private beta](private-beta.md) §4 and §5. Feed and search are off unless those flags were `1` at build time, so `/feed` and `/search` show the private-beta shell. That is expected.

- [x] `https://fosterfolio.com` loads the info page over HTTPS.
- [x] `API_BASE_URL="<api_url>" npm run smoke` prints statuses and no tokens.
- [x] Sign **up** and sign **in** with email and password for an allowlisted address. `/profile` can edit and create a pet.
- [x] `/auth/sign-in` and `/auth/sign-up` have no **Continue with Google** button. An email that is not on the list gets the approved-access message on email signup.
- [ ] `/@handle`, `/@handle/foster-me`, and `/@handle/pet/{id}` resolve (CloudFront rewrite), not the home page.
- [ ] `http://localhost:3001` still talks to the dev Supabase project.



## Terminal

Progress: not started

Copy these from the repo root, in order. Stop after the dry-run if the log does not say `supabase/.env.prod` and the database user `postgres.xjafaxktmpjycuakyouv`. The dev project is `qrttmonymvsibqyryqpt`. A command with no `--env prod` pushes at dev.

Sections 3 and 6 are dashboard only. There is no terminal command for them.

```bash
npm run supabase:push:dry -- --env prod
npm run supabase:push -- --env prod
npm run supabase:list -- --env prod
```

Do not run `npm run supabase:seed`.

`infra/terraform/envs/prod(not-configured-yet)/` is a copy of the dev stack, including `terraform.tfstate` for `fosterfolio-dev` and `dev.fosterfolio.com`. Do not rename it to `prod` and do not apply it. `--env prod` only reads `infra/terraform/envs/prod`, and that directory must be a new copy with no state file.

```bash
mkdir -p infra/terraform/envs/prod
cp infra/terraform/envs/dev/*.tf \
   infra/terraform/envs/dev/.terraform.lock.hcl \
   infra/terraform/envs/dev/terraform.tfvars.example \
   infra/terraform/envs/prod/
cp infra/terraform/envs/dev/terraform.tfvars infra/terraform/envs/prod/terraform.tfvars
```

Edit `infra/terraform/envs/prod/terraform.tfvars` before the plan (section 4). `apps/web/.env.prod` is already the prod project, and `NEXT_PUBLIC_GOOGLE_SSO` is already `0`. The upload overwrites `NEXT_PUBLIC_API_URL` from Terraform, so the localhost value in that file can stay.

```bash
npm run deploy:aws -- --env prod --plan-only
npm run deploy:aws -- --env prod --skip-web
dig +short NS fosterfolio.com @8.8.8.8
terraform -chdir=infra/terraform/envs/prod output -raw web_public_base_url
terraform -chdir=infra/terraform/envs/prod output -raw api_url
```

The plan must be creates only. It must not list destroys for `fosterfolio-dev` or the hosted zone `Z086583512U74ZET8C9T8`. After auth URLs are set in the prod Supabase dashboard (section 6):

```bash
npm run deploy:aws:web -- --env prod
API_BASE_URL="<api_url>" npm run smoke
```

