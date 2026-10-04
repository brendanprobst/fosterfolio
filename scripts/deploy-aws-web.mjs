#!/usr/bin/env node
/**
 * Front-end only: static Next export + S3 sync + CloudFront invalidation.
 *
 * Does **not** build the API Lambda bundle and does **not** run `terraform apply`.
 * Reads `api_url`, bucket, and distribution id from **existing** Terraform state
 * (run a full `npm run deploy:aws -- --env <env>` at least once after infra changes).
 *
 *   npm run deploy:aws:web
 *   npm run deploy:aws:web -- --env prod
 *
 * `NEXT_PUBLIC_API_URL` is taken from Terraform output (same as full deploy).
 * `NEXT_PUBLIC_SUPABASE_*` must be set in the environment or loaded from
 * `apps/web/.env.local` (dev) or `apps/web/.env.prod` (prod).
 *
 * Prerequisites: AWS CLI, Terraform, `terraform.tfvars` in `infra/terraform/envs/<env>/`.
 * See docs/deploy-aws.md.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { envName: "dev" };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--env") {
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

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
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

function main() {
  const opts = parseArgs(process.argv);
  const tfDir = join(root, "infra/terraform/envs", opts.envName);
  if (!existsSync(tfDir)) {
    console.error(`No Terraform environment at infra/terraform/envs/${opts.envName}`);
    process.exit(1);
  }
  const chdir = `-chdir=${tfDir}`;

  loadWebEnv(opts.envName);

  console.log(`→ terraform init (${opts.envName}; read outputs only; no apply)\n`);
  run("terraform", [chdir, "init", "-input=false"]);

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

  const domain = capture("terraform", [chdir, "output", "-raw", "web_cloudfront_domain"]);
  console.log("\nWeb deploy finished.");
  console.log(`  Web (HTTPS): https://${domain}/`);
  console.log(`  API (from state): ${apiUrl}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
