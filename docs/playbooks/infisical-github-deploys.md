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

Copy only these web keys from `apps/web/.env.local` (dev) and `apps/web/.env.prod` (prod): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the three flags. Copy only `SUPABASE_DB_URL` from `supabase/.env.local` and `supabase/.env.prod`. Do not paste `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, or the service role. The service role stays in `infra/terraform/envs/<env>/terraform.tfvars` and in SSM.

`dev` and `prod` both have the same key names, with different values. Inside one environment, put keys in folders by who may read them: `/shared` (Supabase URL, anon key, and the Terraform outputs), `/flags` (web only), `/sensitive` (`SUPABASE_DB_URL` only). **Deploy app** reads `/shared` and `/flags`. A key at `/` is invisible to that job. No GitHub identity gets `/sensitive`. Do not import `/sensitive` into the other folders. Do not paste a whole `.env`. Pass `--path` and only the keys for that folder.

`WEB_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `LAMBDA_FUNCTION_NAME`, and `NEXT_PUBLIC_API_URL` go in `/shared` via `npm run infisical:sync-outputs`, not from a `.env`.

If you already imported a whole `.env` to `/`, move each key into the folder above and delete the copy at `/`.

## Human playbook

### 1. Create the organization

Progress: done

1. Open [https://app.infisical.com](https://app.infisical.com) and create an account.
2. Create one organization named `lattice`.
3. Do not create a project called `shared` yet, and do not put Runout’s keys in the Fosterfolio project.

### 2. Create the Fosterfolio project and paste secrets

Progress: done

1. Create a project named `fosterfolio`.
2. Use environments `dev` and `prod`. Ignore or delete `staging`.
3. In `dev`, create `/shared`, `/flags`, and `/sensitive`.
   - `/shared`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `/flags`: `NEXT_PUBLIC_GOOGLE_SSO`, `NEXT_PUBLIC_FOSTERFOLIO_FEED`, `NEXT_PUBLIC_FOSTERFOLIO_SEARCH` (set each to the value you want in that environment)
   - `/sensitive`: `SUPABASE_DB_URL` only (session pooler, port 5432)
4. In `prod`, create the same folders with the prod values. Use `--path` on every `infisical secrets set`.
5. Check the prod URL contains `xjafaxktmpjycuakyouv` and the dev URL contains `qrttmonymvsibqyryqpt`.
6. Leave the four Terraform outputs for step 7.

### 3. Read the dev secrets from your laptop

Progress: done

1. Install the Infisical CLI from [https://infisical.com/docs/cli/overview](https://infisical.com/docs/cli/overview).
2. In this repo, run `infisical login` and choose `lattice`.
3. Run `infisical init` at the repo root so `.infisical.json` holds the project id. Commit that root file. Do not init inside `infra/terraform/envs/*`.
4. On the Infisical project settings page, copy the project id.
5. Run:

```bash
infisical secrets --projectId=<project id> --env=dev --path=/shared
```

6. Confirm the URL is the dev Supabase project.

### 4. Create the machine identity GitHub will use

Progress: done

1. Fosterfolio project → Access Control → Machine Identities → create `github-fosterfolio`.
2. Grant read on `dev` and `prod` for `/shared` and `/flags` only. The workflow also needs `WEB_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `LAMBDA_FUNCTION_NAME`, and `NEXT_PUBLIC_API_URL` from `/shared`.
3. Do not grant `/sensitive`. That folder is for you, on your laptop.
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
   - `INFISICAL_PROJECT_ID` (same project id in both)
5. Leave the Supabase keys, `TERRAFORM_TFVARS`, and the Terraform outputs out of GitHub. `AWS_REGION` is optional. The workflow uses `us-east-1` when it is unset. After apply, write the bucket, distribution, function name, and API URL with `npm run infisical:sync-outputs -- --env dev` and `--env prod`. `npm run deploy:aws` writes `dev` only. `npm run deploy:aws -- --env prod` writes `prod`.

### 7. One laptop deploy through Infisical

Progress: not started

```bash
infisical run --projectId=<project id> --env=prod -- npm run deploy:aws:web -- --env prod
```

The build should talk to `xjafaxktmpjycuakyouv`. Then load `https://fosterfolio.com`.

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

`.github/workflows/deploy-app.yml` is already in this repo (same file as the template). Do not dispatch it until steps 4–6 are `done` and `/shared` has the four Terraform outputs in both environments.

1. Actions → **Deploy app** → Run workflow. Any branch can deploy **dev**. **Prod** only runs from **`main`**.
2. The job uses the GitHub environment of the same name, assumes `lattice-gha-deploy`, loads `/shared` (required) and `/flags` (optional; missing flags stay off) from Infisical, uploads the static site, invalidates CloudFront, and updates the Lambda zip.
3. It does not run Terraform and does not read `terraform.tfstate`.
4. The log prints the Supabase host and the API host. Confirm the dev host, then load `https://dev.fosterfolio.com` before the first prod run.
5. Leave `.github/workflows/deploy-aws.yml` unused. It applies Terraform for `envs/dev` and expects `TERRAFORM_TFVARS`.

Remote Terraform state, then Terraform in GitHub, is a follow-up. Template backlog items F5 and F2b.
