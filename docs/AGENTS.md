# `docs/` — Documentation

## Contents

- **`adr/`** — Architecture Decision Records numbered `NNN-title.md`; see `adr/README.md` for the index.
- **`plans/`** — Runbooks and backlogs (e.g. [open TODO](plans/todo.md), [smoke test deployment](plans/smoke_test_deployment_guide.plan.md), [template completeness backlog](plans/template_completeness_backlog.plan.md)).
- **[Scaffold workflow](scaffold-workflow.md)** — New repo + clone + `npm run scaffold`; **[refresh an existing spawn](scaffold-workflow.md#refresh-an-existing-spawn-re-sync-from-template)** re-syncs a long-lived fork from a local template checkout (`.lattice/refresh.json` in the target repo).
- **[Repo feature flags](repo-features.md)** — `config/repo-features.json`: enable/disable CI jobs and Dependabot from the start.
- **[Deploy to AWS](deploy-aws.md)** — `npm run deploy:aws`, the manual **Deploy app** workflow (site and Lambda, no Terraform), and the older **Deploy (AWS)** workflow.
- **[Route 53 custom domain](playbooks/route53-custom-domain.md)** — Optional HTTPS hostname, ACM, registrar nameservers.
- **[PostHog analytics](playbooks/posthog-analytics.md)** — Optional, feature-flagged web analytics (`@lattice/web`).
- **[Email allowlist](playbooks/email-allowlist.md)** — Optional private-app signup and API gate.
- **[Infisical and GitHub deploys](playbooks/infisical-github-deploys.md)** — Fosterfolio setup for the shared Infisical vault and a later manual GitHub deploy. Generic steps for the next app are in the template playbook of the same name.
- **[Google SSO](playbooks/google-sso.md)** — Supabase OAuth provider, Google Cloud client, redirect URLs, allowlist interaction.
- **[Private beta](playbooks/private-beta.md)** — Fosterfolio Checkpoint 7: allowlist SQL, Terraform/SSM/CloudFront apply, Playwright + `npm run smoke`.
- **[Prod standup](playbooks/prod-standup.md)** — New Supabase project (schema only) and local `envs/prod` Terraform. CLI deploy. Google SSO is out of go-live.
- **[Supabase migrations](playbooks/supabase-migrations.md)** — CLI / psql workflow; one Supabase project per spawn repo (planned `supabase/` layout).
- **[Development seed data](playbooks/dev-seed-data.md)** — `npm run supabase:seed`: sign-in-ready fosters, pets, and a pageable feed in `supabase/seed/` (not a migration).
- **[Upstream harvest](playbooks/upstream-harvest.md)** — Pull platform work from a **child app** into the template (`npm run lattice:harvest-index`); harvest reports live in ecosystem `cursor/research/harvests/`.
- **[How to close out a work session](playbooks/how-to-close-out-a-work-session.md)** — `/session` after a stretch of agent work: re-read the files touched, keep a brain dump, and commit a `SESSION` stop in `docs/plans/sessions/log.md`.
- **[Scaffold vs adapters](research/scaffold-agents-and-adapters.md)** — Why `npm run scaffold` does not generate adapters; how agent rules scope to API infra vs web analytics.
- **`research/`** — Exploratory notes (not ADRs), e.g. [Supabase access patterns](research/supabase-access-patterns.md) (client SDK vs API vs ORM) and the canonical [security-first Supabase Auth default](research/supabase-auth-security-first.md) for API/client separation.

## For agents

Read ADRs when changing layering, `Result` usage, repositories, use case shape, **persistence adapters**, or **deployment / full-stack** layout. Keep ADRs accurate when you make deliberate architectural changes; see [ADR-006](adr/006-full-stack-and-deployment.md) for hosting/Terraform decisions and [ADR-007](adr/007-ci-and-environment-promotion.md) for CI/deployment promotion policy. Use **`research/`** for onboarding tradeoffs that do not yet rise to a recorded ADR.
