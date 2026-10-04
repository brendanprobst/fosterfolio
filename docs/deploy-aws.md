# Deploy to AWS (Terraform + Lambda + static web)

Two ways to deploy:

1. **Laptop:** **`npm run deploy:aws`** (your AWS credentials and `infra/terraform/envs/<env>/terraform.tfvars`). **`--env`** defaults to **`dev`**. This is the path that runs Terraform.
2. **GitHub Actions:** workflow **Deploy app** for site and Lambda updates. Manual only. It does not run Terraform.

The laptop script order is: **build API Lambda bundle → `terraform apply` → read `api_url` → build static web with `NEXT_PUBLIC_API_URL` → `aws s3 sync`**.

## Prerequisites

- **AWS CLI** and credentials that can run Terraform and S3 sync (`aws sts get-caller-identity`).
- **Terraform** `>= 1.6`.
- **`terraform.tfvars`** in `infra/terraform/envs/<env>/` (copy from `terraform.tfvars.example`). Do not commit secrets. Default env is **`dev`**.
- For a laptop **web** build: **`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** must be in the env file. **`dev`** loads the first of **`apps/web/.env.dev`**, **`.env.local`**, **`.env`**. Any other **`--env`** loads only **`apps/web/.env.<env>`** and will not fall back to a dev file. `infisical run` can wrap the command; the file still wins for `NEXT_PUBLIC_*`. GitHub **Deploy app** reads those keys from Infisical instead.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run deploy:aws` | Full deploy of **`envs/dev`** (interactive `terraform apply` when in a TTY). |
| `npm run deploy:aws -- --env prod` | Same pipeline against **`infra/terraform/envs/prod`**. Web build requires **`apps/web/.env.prod`**. |
| `npm run deploy:aws -- --plan-only` | `terraform init` + `terraform plan` only. |
| `npm run deploy:aws -- --skip-web` | Lambda + Terraform only (no static build, no S3 sync). |
| `npm run deploy:aws -- --skip-api-build` | Reuse existing `apps/api/dist-lambda` (still runs Terraform + web). |
| `npm run deploy:aws -- --auto-approve` | Non-interactive apply (required in CI and headless shells). |
| `npm run deploy:aws:web` | Static web only for `envs/dev`: build, S3 sync, CloudFront invalidation (no Lambda build, no `terraform apply`). |
| `npm run deploy:aws:web -- --env prod` | Static web only against prod Terraform outputs. |
| `npm run infisical:sync-outputs -- --env <env>` | Write bucket, distribution, Lambda name, and API URL from Terraform state into Infisical `/fosterfolio/shared`. |

Always pass **`--auto-approve`** for non-interactive full deploys.

## Laptop deploy with Infisical

After `infisical login` in this repo, keep `apps/web/.env.local` (or `.env.dev`) and `apps/web/.env.prod` on disk. The deploy script reads those files. Then:

```bash
infisical run --env=dev -- npm run deploy:aws
infisical run --env=prod -- npm run deploy:aws -- --env prod
infisical run --env=prod -- npm run deploy:aws:web -- --env prod
```

The script prints the Supabase host and the API host before the web build. After a successful apply, it writes `WEB_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `LAMBDA_FUNCTION_NAME`, and `NEXT_PUBLIC_API_URL` to Infisical `/fosterfolio/shared` for that environment. That write uses your Infisical login. GitHub Actions does not run it.

If the Infisical CLI is missing or the write fails, the deploy still finishes. Re-run `npm run infisical:sync-outputs -- --env <env>`. Keep `terraform.tfvars` on disk; Terraform still reads the service role from that file.

## Deploy the site and Lambda without Terraform

Workflow: **`.github/workflows/deploy-app.yml`** (**Actions → Deploy app → Run workflow**). Manual only. It does not apply Terraform and does not read `terraform.tfstate`.

Pick `dev` or `prod`. The job uses the GitHub environment of the same name, so a dev run cannot read prod secrets. Any branch can deploy **dev**. **Prod** only runs from **`main`**. `/fosterfolio/flags` is optional; missing flags stay off.

Secrets and variables for that environment are listed in [`docs/playbooks/infisical-github-deploys.md`](playbooks/infisical-github-deploys.md). The job reads Supabase keys, optional feature flags, and the Terraform outputs (`WEB_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `LAMBDA_FUNCTION_NAME`, `NEXT_PUBLIC_API_URL`) from Infisical `/fosterfolio/shared` and `/fosterfolio/flags`. `npm run infisical:sync-outputs` writes those outputs after a laptop apply. The only GitHub variable is `INFISICAL_PROJECT_SLUG`.

## See also

- [`infra/terraform/README.md`](../infra/terraform/README.md) — AWS account setup, cost controls.
- [`docs/playbooks/route53-custom-domain.md`](playbooks/route53-custom-domain.md) — Custom domain, Route 53, ACM, and registrar nameserver steps.
- [`docs/plans/smoke_test_deployment_guide.plan.md`](plans/smoke_test_deployment_guide.plan.md) — Post-deploy smoke checks.
