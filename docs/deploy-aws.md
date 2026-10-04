# Deploy to AWS (Terraform + Lambda + static web)

Two ways to deploy:

1. **Local / CI runner:** **`npm run deploy:aws`** (uses your AWS credentials and `infra/terraform/envs/<env>/terraform.tfvars`). **`--env`** defaults to **`dev`**.
2. **GitHub Actions:** workflow **Deploy app** for site and Lambda updates. Leave the older **Deploy (AWS)** workflow unused once that path is live.

The script order is: **build API Lambda bundle → `terraform apply` → read `api_url` → build static web with `NEXT_PUBLIC_API_URL` → `aws s3 sync`**.

## Prerequisites

- **AWS CLI** and credentials that can run Terraform and S3 sync (`aws sts get-caller-identity`).
- **Terraform** `>= 1.6`.
- **`terraform.tfvars`** in `infra/terraform/envs/<env>/` (copy from `terraform.tfvars.example`). Do not commit secrets. Default env is **`dev`**.
- For the **web** build: **`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** from Infisical (`infisical run --env=<env>`) or from the env file. **`dev`** loads the first of **`apps/web/.env.dev`**, **`.env.local`**, **`.env`**. Any other **`--env`** loads only **`apps/web/.env.<env>`** and will not fall back to a dev file.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run deploy:aws` | Full deploy of **`envs/dev`** (interactive `terraform apply` when in a TTY). |
| `npm run deploy:aws -- --env prod` | Same pipeline against **`infra/terraform/envs/prod`**. Web build requires **`apps/web/.env.prod`** (or Infisical). |
| `npm run deploy:aws -- --plan-only` | `terraform init` + `terraform plan` only. |
| `npm run deploy:aws -- --skip-web` | Lambda + Terraform only (no static build, no S3 sync). |
| `npm run deploy:aws -- --skip-api-build` | Reuse existing `apps/api/dist-lambda` (still runs Terraform + web). |
| `npm run deploy:aws -- --auto-approve` | Non-interactive apply (required in CI and headless shells). |
| `npm run deploy:aws:web` | Static web only for `envs/dev`: build, S3 sync, CloudFront invalidation (no Lambda build, no `terraform apply`). |
| `npm run deploy:aws:web -- --env prod` | Static web only against prod Terraform outputs. |
| `npm run infisical:sync-outputs -- --env <env>` | Write bucket, distribution, Lambda name, and API URL from Terraform state into Infisical `/shared`. |

**CI / automation:** always pass **`--auto-approve`** for full deploys. The older **Deploy (AWS)** workflow still applies `envs/dev` only.

## Laptop deploy with Infisical

After `infisical login` in this repo, the normal laptop deploy is:

```bash
infisical run --env=dev -- npm run deploy:aws
infisical run --env=prod -- npm run deploy:aws -- --env prod
infisical run --env=prod -- npm run deploy:aws:web -- --env prod
```

The script prints the Supabase host and the API host before the web build. After a successful apply, it writes `WEB_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `LAMBDA_FUNCTION_NAME`, and `NEXT_PUBLIC_API_URL` to Infisical `/shared` for that environment. That write uses your Infisical login. GitHub Actions does not run it.

If the Infisical CLI is missing or the write fails, the deploy still finishes. Re-run `npm run infisical:sync-outputs -- --env <env>`. Keep `terraform.tfvars` on disk; Terraform still reads the service role from that file.

## Deploy the site and Lambda without Terraform

Workflow: **`.github/workflows/deploy-app.yml`** (**Actions → Deploy app → Run workflow**). Manual only. It does not apply Terraform and does not read `terraform.tfstate`.

Pick `dev` or `prod`. The job uses the GitHub environment of the same name, so a dev run cannot read prod secrets. Pick branch **`mvp`**.

Secrets and variables for that environment are listed in [`docs/playbooks/infisical-github-deploys.md`](playbooks/infisical-github-deploys.md). The job reads Supabase keys, feature flags, and the Terraform outputs (`WEB_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `LAMBDA_FUNCTION_NAME`, `NEXT_PUBLIC_API_URL`) from Infisical `/shared` and `/flags`. `npm run infisical:sync-outputs` writes those outputs after a laptop apply. The only GitHub variable is `INFISICAL_PROJECT_ID`.

**Deploy (AWS)** above is the older path. It applies Terraform for `envs/dev` and expects `TERRAFORM_TFVARS`. Leave it unused once **Deploy app** is the path you run.

## GitHub Actions (OIDC)

Workflow: **`.github/workflows/deploy-aws.yml`**. It runs only when you trigger it manually; it does **not** run on every commit.

### 1. IAM OIDC trust for GitHub

Create an IAM role that trusts **`sts:AssumeRoleWithWebIdentity`** for your GitHub org/repo (see [GitHub OIDC on AWS](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)). Attach policies that allow Terraform to manage this stack and S3 sync to the web bucket.

### 2. Repository secrets / variables

| Name | Required | Purpose |
|------|----------|---------|
| **`AWS_DEPLOY_ROLE_ARN`** | Yes | ARN of the OIDC role (e.g. `arn:aws:iam::123456789012:role/github-deploy-lattice`). |
| **`TERRAFORM_TFVARS`** | Yes | **Full** contents of your `terraform.tfvars` (multiline). |
| **`NEXT_PUBLIC_SUPABASE_URL`** | For full web deploy | Same as local web build. |
| **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** | For full web deploy | Same as local web build. |
| **`AWS_REGION`** | — | The workflow pins **`us-east-1`** for `configure-aws-credentials`; keep **`aws_region`** in `terraform.tfvars` consistent (change both if you use another region). |

If **`NEXT_PUBLIC_*`** secrets are missing and you did not skip web, the workflow may still run if those values exist inside the loaded `.env` files in the repo (they usually should **not** be committed).

### 3. Run

**Actions → Deploy (AWS) → Run workflow** (branch **main**). Optional: **Skip web** to deploy API + infra only.

### 4. Remote Terraform state

If you enable an **S3 backend** in `infra/terraform/envs/dev/versions.tf`, the OIDC role needs **S3/DynamoDB** permissions for state, and the first run may need `terraform init -migrate-state` locally before CI can apply.

## See also

- [`infra/terraform/README.md`](../infra/terraform/README.md) — AWS account setup, cost controls.
- [`docs/playbooks/route53-custom-domain.md`](playbooks/route53-custom-domain.md) — Custom domain, Route 53, ACM, and registrar nameserver steps.
- [`docs/plans/smoke_test_deployment_guide.plan.md`](plans/smoke_test_deployment_guide.plan.md) — Post-deploy smoke checks.
