# Infisical and GitHub deploys (Fosterfolio)

Fosterfolio is the first app in the shared Lattice vault. The generic steps for every future app live in the template: `lattice-app-template/docs/playbooks/infisical-github-deploys.md`. Follow this file for Fosterfolio. It has the names filled in.

One Infisical organization (`lattice`) holds every side project. Fosterfolio is its own project, with `dev` and `prod`. GitHub will deploy the website and the Lambda zip after the setup below. Terraform stays on this laptop. Nothing here changes the live site until you run a deploy yourself.

Progress on each step: `not started`, `in progress`, or `done`.

## Names for this app

| Thing | Value |
| --- | --- |
| Infisical organization | `lattice` |
| Infisical project | `fosterfolio` |
| Environments | `dev`, `prod` |
| Machine identity | `github-fosterfolio` |
| Git branch that ships | `mvp` |
| Dev site | `https://dev.fosterfolio.com` |
| Prod site | `https://fosterfolio.com` |
| Dev Supabase ref | `qrttmonymvsibqyryqpt` |
| Prod Supabase ref | `xjafaxktmpjycuakyouv` |
| AWS account | `537124980154` |
| IAM role to create | `lattice-gha-deploy` |

Copy web keys from `apps/web/.env.local` (dev) and `apps/web/.env.prod` (prod). Copy `SUPABASE_DB_URL` from `supabase/.env.local` and `supabase/.env.prod`. The service role stays in `infra/terraform/envs/<env>/terraform.tfvars` and in SSM. Do not paste it into Infisical.

`dev` and `prod` both have the same key names, with different values. Inside one environment, put keys in folders by who may read them: `/shared` (public Supabase values and config both web and API may see), `/flags` (web only), `/sensitive` (database URL and anything else that must never enter a web build). The web job reads `/shared` and `/flags`. No GitHub identity gets `/sensitive`. Do not import `/sensitive` into the other folders.

A full `.env` paste works. Full-line `#` comments, `//` comments, and blank lines are dropped. A key that already exists is overwritten. The same key twice in one file keeps the last value and does not warn you. Delete the service role line before import.

## Human playbook

### 1. Create the organization

Progress: not started

1. Open [https://app.infisical.com](https://app.infisical.com) and create an account.
2. Create one organization named `lattice`.
3. Do not create a project called `shared` yet, and do not put Runout’s keys in the Fosterfolio project.

### 2. Create the Fosterfolio project and paste secrets

Progress: not started

1. Create a project named `fosterfolio`.
2. Use environments `dev` and `prod`. Ignore or delete `staging`.
3. In `dev`, create `/shared`, `/flags`, and `/sensitive`.
   - `/shared`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `/flags`: `NEXT_PUBLIC_GOOGLE_SSO` (`0`), `NEXT_PUBLIC_FOSTERFOLIO_FEED` (`0` unless you want the feed on), `NEXT_PUBLIC_FOSTERFOLIO_SEARCH` (`0` unless you want search on)
   - `/sensitive`: `SUPABASE_DB_URL` (session pooler, port 5432)
4. In `prod`, create the same folders with the prod values. `NEXT_PUBLIC_GOOGLE_SSO` stays `0`.
5. Check the prod URL contains `xjafaxktmpjycuakyouv` and the dev URL contains `qrttmonymvsibqyryqpt`.

### 3. Read the dev secrets from your laptop

Progress: not started

1. Install the Infisical CLI from [https://infisical.com/docs/cli/overview](https://infisical.com/docs/cli/overview).
2. In this repo, run `infisical login` and choose `lattice`.
3. On the Infisical project settings page, copy the project id.
4. Run:

```bash
infisical secrets --projectId=<project id> --env=dev
```

5. Confirm the URL is the dev Supabase project.

### 4. Create the machine identity GitHub will use

Progress: not started

1. Fosterfolio project → Access Control → Machine Identities → create `github-fosterfolio`.
2. Grant read on `dev` and `prod` for `/shared` and `/flags` only. The workflow also needs `WEB_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `LAMBDA_FUNCTION_NAME`, and `NEXT_PUBLIC_API_URL` from `/shared`.
3. Do not grant `/sensitive`. That folder is for you, on your laptop.
4. Turn on universal auth and save the client id and client secret in a password manager.

### 5. Create the AWS role

Progress: not started

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

Progress: not started

Repo → Settings → Environments.

1. Create `dev` and `prod`.
2. On `prod`, require a reviewer (you).
3. In both environments, add secrets:
   - `INFISICAL_CLIENT_ID`
   - `INFISICAL_CLIENT_SECRET`
   - `AWS_ROLE_ARN`
4. In both environments, add one variable:
   - `INFISICAL_PROJECT_ID` (same project id in both)
5. Leave the Supabase keys, `TERRAFORM_TFVARS`, and the Terraform outputs out of GitHub. `AWS_REGION` is optional. The workflow uses `us-east-1` when it is unset. After apply, write the bucket, distribution, function name, and API URL with `npm run infisical:sync-outputs -- --env dev` and `--env prod`. Later applies through `npm run deploy:aws` do the dev write themselves.

### 7. One laptop deploy through Infisical

Progress: not started

```bash
infisical run --projectId=<project id> --env=prod -- npm run deploy:aws:web -- --env prod
```

The build should talk to `xjafaxktmpjycuakyouv`. Then load `https://fosterfolio.com`.

Until steps 4–6 are done, this is how prod web deploys work. Full stack (Terraform plus Lambda) is still:

```bash
npm run deploy:aws -- --env prod
```

## What you run after the steps above

`.github/workflows/deploy-app.yml` is already in this repo (same file as the template). Do not dispatch it until steps 4–6 are `done`.

1. Actions → **Deploy app** → Run workflow. Choose branch `mvp` and environment `dev`.
2. The job uses the GitHub environment of the same name, assumes `lattice-gha-deploy`, loads `/shared` and `/flags` from Infisical (including the Terraform outputs), uploads the static site, invalidates CloudFront, and updates the Lambda zip.
3. It does not run Terraform and does not read `terraform.tfstate`.
4. The log prints the Supabase host and the API host. Confirm the dev host, then load `https://dev.fosterfolio.com` before the first prod run.
5. Leave `.github/workflows/deploy-aws.yml` unused. It applies Terraform for `envs/dev` and expects `TERRAFORM_TFVARS`.

Remote Terraform state, then Terraform in GitHub, is a follow-up. Template backlog items F5 and F2b.
