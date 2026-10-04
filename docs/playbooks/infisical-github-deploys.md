# Infisical and GitHub deploys (Fosterfolio)

Fosterfolio is the first app in the shared Lattice vault. The generic steps for every future app live in the template: `lattice-app-template/docs/playbooks/infisical-github-deploys.md`. Follow this file for Fosterfolio. It has the names filled in.

One Infisical organization (your personal org) holds one project named `lattice`. That project is the Lattice ecosystem env system. Apps are not separate Infisical projects. Isolate an app under `/<app>/**` (copy `/fosterfolio/{shared,flags,sensitive}` for the next app and change values). GitHub **Deploy app** points at the **`lattice` project slug** and reads only `/fosterfolio/**`.

Fosterfolio uses `/fosterfolio/shared`, `/fosterfolio/flags`, and `/fosterfolio/sensitive`, with Infisical environments `dev` and `prod`. GitHub will deploy the website and the Lambda zip after the setup below. Terraform stays on this laptop. Nothing here changes the live site until you run a deploy yourself.

Progress on each step: `not started`, `in progress`, or `done`.

## Names for this app

| Thing | Value |
| --- | --- |
| Infisical organization | Personal org (Brendan Probst). Not a GitHub variable. |
| Infisical project | `lattice` (one project for every Lattice app) |
| Infisical project slug | from the URL after you open the **lattice** project, `…/project/<slug>/…` — not the org name, not the UUID |
| Fosterfolio folders | `/fosterfolio/shared`, `/fosterfolio/flags`, `/fosterfolio/sensitive` |
| Environments | `dev`, `prod` (same names in Infisical and GitHub) |
| Machine identity | `github-fosterfolio` |
| Deploy targets | `dev`, `prod` |
| Prod GitHub deploys from | `main` |
| Dev site | `https://dev.fosterfolio.com` |
| Prod site | `https://fosterfolio.com` |
| Dev Supabase ref | `qrttmonymvsibqyryqpt` |
| Prod Supabase ref | `xjafaxktmpjycuakyouv` |
| AWS account | `537124980154` |
| IAM role to create | `lattice-gha-deploy` |

Fosterfolio used a git branch named `mvp` for early product work. That name is legacy. Environments and GitHub deploys are `dev` and `prod`. Prod GitHub deploys run from `main`.

Copy only these web keys from `apps/web/.env.local` (dev) and `apps/web/.env.prod` (prod): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the three flags. Copy only `SUPABASE_DB_URL` from `supabase/.env.local` and `supabase/.env.prod`. Do not paste `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, or the service role. The service role stays in `infra/terraform/envs/<env>/terraform.tfvars` and in SSM.

`dev` and `prod` both have the same key names, with different values. Inside one environment, put Fosterfolio keys only under `/fosterfolio/**`: `/fosterfolio/shared` (Supabase URL, anon key, and the Terraform outputs), `/fosterfolio/flags` (web only), `/fosterfolio/sensitive` (`SUPABASE_DB_URL` only). **Deploy app** reads `/fosterfolio/shared` and `/fosterfolio/flags`. A key at `/` or `/shared` is invisible to that job. No GitHub identity gets `/fosterfolio/sensitive`. Do not import `/fosterfolio/sensitive` into the other folders. Do not paste a whole `.env`. Pass `--path` and only the keys for that folder.

`WEB_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `LAMBDA_FUNCTION_NAME`, and `NEXT_PUBLIC_API_URL` go in `/fosterfolio/shared` via `npm run infisical:sync-outputs`, not from a `.env`.

If you already imported keys to `/` or `/shared`, move them under `/fosterfolio/**` and delete the old copies.

## Human playbook

### 1. Create the organization

Progress: done

1. Open [https://app.infisical.com](https://app.infisical.com) and create an account.
2. Use your personal organization. Create one project named `lattice`.
3. Do not create a second Infisical project per app. The next app copies `/fosterfolio/**` to `/<app>/**` and changes values.

### 2. Create the Fosterfolio folders and paste secrets

Progress: done

1. In the `lattice` project, keep environments `dev` and `prod`. Ignore or delete `staging`.
2. In `dev`, create `/fosterfolio/shared`, `/fosterfolio/flags`, and `/fosterfolio/sensitive`.
   - `/fosterfolio/shared`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `/fosterfolio/flags`: `NEXT_PUBLIC_GOOGLE_SSO`, `NEXT_PUBLIC_FOSTERFOLIO_FEED`, `NEXT_PUBLIC_FOSTERFOLIO_SEARCH` (set each to the value you want in that environment)
   - `/fosterfolio/sensitive`: `SUPABASE_DB_URL` only (session pooler, port 5432)
3. In `prod`, create the same folders with the prod values. Use `--path` on every `infisical secrets set`.
4. Check the prod URL contains `xjafaxktmpjycuakyouv` and the dev URL contains `qrttmonymvsibqyryqpt`.
5. Leave the four Terraform outputs for step 7.

### 3. Read the dev secrets from your laptop

Progress: done

1. Install the Infisical CLI from [https://infisical.com/docs/cli/overview](https://infisical.com/docs/cli/overview).
2. In this repo, run `infisical login` and choose your personal org, then the `lattice` project.
3. Run `infisical init` at the repo root so `.infisical.json` holds the `lattice` project id. Do not commit it (gitignored). Do not init inside `infra/terraform/envs/*`.
4. On the Infisical project settings page, copy the project id (laptop CLI) and the project slug (GitHub variable).
5. Run:

```bash
infisical secrets --projectId=<project id> --env=dev --path=/fosterfolio/shared
```

6. Confirm the URL is the dev Supabase project.

### 4. Create the machine identity GitHub will use

Progress: done

1. `lattice` project → Access Control → Machine Identities → create `github-fosterfolio`.
2. Grant read on `dev` and `prod` for `/fosterfolio/shared` and `/fosterfolio/flags` only. The workflow also needs `WEB_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `LAMBDA_FUNCTION_NAME`, and `NEXT_PUBLIC_API_URL` from `/fosterfolio/shared`.
3. Do not grant `/fosterfolio/sensitive`. That folder is for you, on your laptop.
4. Turn on universal auth and save the client id and client secret in a password manager.

### 5. Create the AWS role

Progress: done

1. IAM → Identity providers. Add `token.actions.githubusercontent.com` with audience `sts.amazonaws.com` if it is not already there.
2. Create role `lattice-gha-deploy`.
3. Trust GitHub OIDC for this repo only (`repo:<your-github-org>/fosterfolio:*`).
4. Allow only:
   - S3 read/write on `fosterfolio-dev-web` and `fosterfolio-prod-web`
   - `cloudfront:CreateInvalidation` on the dev and prod distributions
   - `lambda:UpdateFunctionCode` and `lambda:GetFunction` on `fosterfolio-dev-api` and `fosterfolio-prod-api`
5. If a name does not match, run `terraform output` in `infra/terraform/envs/dev` and `infra/terraform/envs/prod` and use the live names.

This role cannot apply Terraform.

### 6. GitHub environments

Progress: done

Repo → Settings → Environments.

1. Create `dev` and `prod`.
2. On `prod`, require a reviewer (you).
3. In both environments, add secrets:
   - `INFISICAL_CLIENT_ID`
   - `INFISICAL_CLIENT_SECRET`
   - `AWS_ROLE_ARN`
4. In both environments, add one variable:
   - `INFISICAL_PROJECT_SLUG` (slug of the **lattice** project from `app.infisical.com/project/<slug>/…`. Same slug on `dev` and `prod`. Not the org name. Not the project UUID.)
5. Leave the Supabase keys, `TERRAFORM_TFVARS`, and the Terraform outputs out of GitHub. `AWS_REGION` is optional. The workflow uses `us-east-1` when it is unset. After apply, write the bucket, distribution, function name, and API URL with `npm run infisical:sync-outputs -- --env dev` and `--env prod`. `npm run deploy:aws` writes `dev` only. `npm run deploy:aws -- --env prod` writes `prod`.

### 7. One laptop deploy through Infisical

Progress: not started

```bash
infisical run --projectId=<project id> --env=prod -- npm run deploy:aws:web -- --env prod
```

`apps/web/.env.prod` must exist. The script loads that file; Infisical does not replace it. The build should talk to `xjafaxktmpjycuakyouv`. Then load `https://fosterfolio.com`.

That command reads the bucket and API URL from Terraform state. GitHub cannot. After the laptop deploy:

```bash
npm run infisical:sync-outputs -- --env prod
npm run infisical:sync-outputs -- --env dev
```

Full stack (Terraform plus Lambda) is still:

```bash
npm run deploy:aws -- --env prod
```

## What you run after the steps above

`.github/workflows/deploy-app.yml` is already in this repo (same file as the template). Do not dispatch it until steps 4–6 are `done` and `/fosterfolio/shared` has the four Terraform outputs in both environments.

1. Actions → **Deploy app** → Run workflow. Any branch can deploy **dev**. **Prod** only runs from **`main`**.
2. The job uses the GitHub environment of the same name, assumes `lattice-gha-deploy`, loads `/fosterfolio/shared` (required) and `/fosterfolio/flags` (optional; missing flags stay off) from Infisical, uploads the static site, invalidates CloudFront, and updates the Lambda zip.
3. It does not run Terraform and does not read `terraform.tfstate`.
4. The log prints the Supabase host and the API host. Confirm the dev host, then load `https://dev.fosterfolio.com` before the first prod run.
5. Terraform apply stays on the laptop (`npm run deploy:aws`). GitHub only runs **Deploy app**.

Remote Terraform state, then Terraform in GitHub, is a follow-up. Template backlog items F5 and F2b.
