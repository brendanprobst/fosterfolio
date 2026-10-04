#!/usr/bin/env node
/**
 * Deploy API (Lambda bundle) + Terraform (AWS infra) + static web build + S3 sync.
 *
 * Order: build Lambda → terraform apply → read api_url → build web (NEXT_PUBLIC_API_URL from Terraform)
 * → aws s3 sync → cloudfront invalidation. Supabase NEXT_PUBLIC_* must come from env or apps/web/.env* files.
 *
 *   npm run deploy:aws
 *   npm run deploy:aws -- --env prod
 *   npm run deploy:aws -- --plan-only
 *   npm run deploy:aws -- --skip-web          # infra + API only (no static site build/sync)
 *   npm run deploy:aws -- --skip-api-build
 *   npm run deploy:aws -- --auto-approve     # terraform apply -auto-approve (required in non-TTY)
 *
 * Web-only (no Lambda / no apply): npm run deploy:aws:web — see scripts/deploy-aws-web.mjs
 *
 * Prerequisites: AWS CLI + credentials, Terraform, terraform.tfvars in infra/terraform/envs/<env>/
 * (or equivalent TF_VAR_*). See docs/deploy-aws.md.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    planOnly: false,
    skipWeb: false,
    skipApiBuild: false,
    autoApprove: false,
    envName: "dev",
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--plan-only") opts.planOnly = true;
    else if (a === "--skip-web") opts.skipWeb = true;
    else if (a === "--skip-api-build") opts.skipApiBuild = true;
    else if (a === "--auto-approve") opts.autoApprove = true;
    else if (a === "--env") {
      opts.envName = args[++i];
      if (!opts.envName) {
        console.error("Missing value for --env");
        process.exit(1);
      }
    } else if (a.startsWith("-")) {
      console.error(`Unknown flag: ${a}`);
      process.exit(1);
    } else {
      console.error(`Unexpected argument: ${a}`);
      process.exit(1);
    }
  }
  if (!/^[a-z0-9-]+$/.test(opts.envName)) {
    console.error(`Refusing environment name: ${opts.envName}`);
    process.exit(1);
  }
  return opts;
}

function loadEnvFile(relPath) {
  const full = join(root, relPath);
  if (!existsSync(full)) return;
  for (const line of readFileSync(full, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function loadWebEnv(envName) {
  if (envName === "prod") {
    loadEnvFile("apps/web/.env.prod");
    loadEnvFile("apps/web/.env.production.local");
    return;
  }
  loadEnvFile("apps/web/.env.production.local");
  loadEnvFile("apps/web/.env.local");
}

function run(cmd, args, extraEnv = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    shell: false,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function capture(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || `${cmd} failed`);
    process.exit(r.status ?? 1);
  }
  return (r.stdout || "").trim();
}

function logPublicHosts() {
  for (const [label, value] of [
    ["Supabase host", process.env.NEXT_PUBLIC_SUPABASE_URL],
    ["API host", process.env.NEXT_PUBLIC_API_URL],
  ]) {
    if (!value) continue;
    try {
      console.log(`→ ${label}: ${new URL(value).host}`);
    } catch {
      console.warn(`→ ${label}: NEXT_PUBLIC value is not a valid URL`);
    }
  }
}

function terraformDir(envName) {
  const tfDir = join(root, "infra/terraform/envs", envName);
  if (!existsSync(tfDir)) {
    console.error(`No Terraform environment at infra/terraform/envs/${envName}`);
    process.exit(1);
  }
  return { tfDir, chdir: `-chdir=${tfDir}` };
}

function main() {
  const opts = parseArgs(process.argv);
  const { chdir } = terraformDir(opts.envName);

  loadWebEnv(opts.envName);

  if (!opts.skipApiBuild) {
    console.log("→ npm run api:build:lambda\n");
    run("npm", ["run", "api:build:lambda"]);
  }

  console.log(`→ terraform init (${opts.envName})\n`);
  run("terraform", [chdir, "init", "-input=false"]);

  if (opts.planOnly) {
    console.log("→ terraform plan\n");
    run("terraform", [chdir, "plan", "-input=false"]);
    console.log("\nPlan complete (--plan-only). No apply, no web build.");
    return;
  }

  if (!opts.autoApprove && !process.stdout.isTTY) {
    console.error(
      "Refusing terraform apply in a non-interactive terminal without --auto-approve (e.g. CI).",
    );
    process.exit(1);
  }

  const applyArgs = [chdir, "apply", "-input=false"];
  if (opts.autoApprove) applyArgs.push("-auto-approve");

  console.log("→ terraform apply\n");
  run("terraform", applyArgs);
  syncInfisicalOutputs(opts.envName);

  if (opts.skipWeb) {
    console.log("\nSkipped web build and S3 sync (--skip-web).");
    printOutputs(chdir);
    return;
  }

  const apiUrl = capture("terraform", [chdir, "output", "-raw", "api_url"]);
  process.env.NEXT_PUBLIC_API_URL = apiUrl;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn(
      "\nWarning: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY are not set.\n" +
        "Set them with `infisical run --env=" +
        opts.envName +
        "` or in apps/web/.env.local / apps/web/.env.prod before running this script.\n" +
        "Web build may fail or point at the wrong Supabase project.\n",
    );
  }

  console.log(`→ NEXT_PUBLIC_API_URL=${apiUrl}`);
  logPublicHosts();
  console.log("→ npm run web:build:static\n");
  run("npm", ["run", "web:build:static"]);

  const bucket = capture("terraform", [chdir, "output", "-raw", "web_bucket_name"]);
  const outDir = join(root, "apps/web/out");
  if (!existsSync(outDir)) {
    console.error(`Missing ${outDir} after static build.`);
    process.exit(1);
  }

  console.log(`→ aws s3 sync → s3://${bucket}\n`);
  run("aws", ["s3", "sync", outDir, `s3://${bucket}`, "--delete"]);

  const distributionId = capture("terraform", [chdir, "output", "-raw", "web_cloudfront_distribution_id"]);
  console.log(`→ aws cloudfront create-invalidation (${distributionId})\n`);
  run("aws", [
    "cloudfront",
    "create-invalidation",
    "--distribution-id",
    distributionId,
    "--paths",
    "/*",
  ]);

  console.log("\nDeploy finished.");
  printOutputs(chdir);
}

function syncInfisicalOutputs(envName) {
  if (process.env.GITHUB_ACTIONS) {
    console.log("→ skip Infisical output sync (GitHub Actions)\n");
    return;
  }
  if (!existsSync(join(root, ".infisical.json"))) {
    console.log("→ skip Infisical output sync (no .infisical.json)\n");
    return;
  }
  const check = spawnSync("infisical", ["--version"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (check.error || check.status !== 0) {
    console.warn(
      "→ skip Infisical output sync (install the Infisical CLI and run `infisical login`)\n",
    );
    return;
  }
  console.log(`→ sync Terraform outputs to Infisical /shared (${envName})\n`);
  const result = spawnSync(
    "node",
    ["scripts/sync-infisical-terraform-outputs.mjs", "--env", envName],
    {
      cwd: root,
      stdio: "inherit",
      env: process.env,
      shell: false,
    },
  );
  if (result.error || result.status !== 0) {
    console.warn(
      `\nInfisical output sync failed. Apply already finished. Re-run:\n  npm run infisical:sync-outputs -- --env ${envName}\n`,
    );
  }
}

function printOutputs(chdir) {
  const apiUrl = capture("terraform", [chdir, "output", "-raw", "api_url"]);
  const domain = capture("terraform", [chdir, "output", "-raw", "web_cloudfront_domain"]);
  console.log("\nOutputs:");
  console.log(`  API:        ${apiUrl}`);
  console.log(`  Web (HTTPS): https://${domain}/`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
