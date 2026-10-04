#!/usr/bin/env node
/**
 * Write stable Terraform outputs into Infisical /shared.
 *
 *   npm run infisical:sync-outputs -- --env dev
 *   npm run infisical:sync-outputs -- --env prod
 *
 * `npm run deploy:aws` calls this after a successful apply when `.infisical.json` exists.
 * GitHub Actions does not run Terraform, so it cannot do this write. Deploy app reads the
 * same keys back from /shared.
 *
 * Requires `infisical login` as a user who can write /shared. The GitHub machine identity
 * is read-only and cannot run this script.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const OUTPUT_KEYS = [
  ["web_bucket_name", "WEB_BUCKET"],
  ["web_cloudfront_distribution_id", "CLOUDFRONT_DISTRIBUTION_ID"],
  ["api_lambda_function_name", "LAMBDA_FUNCTION_NAME"],
  ["api_url", "NEXT_PUBLIC_API_URL"],
];

function parseArgs(argv) {
  let envName = "dev";
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--env") {
      envName = argv[++i];
      if (!envName) {
        console.error("Missing value for --env");
        process.exit(1);
      }
    } else if (arg.startsWith("-")) {
      console.error(`Unknown flag: ${arg}`);
      process.exit(1);
    } else {
      console.error(`Unexpected argument: ${arg}`);
      process.exit(1);
    }
  }
  if (!/^[a-z0-9-]+$/.test(envName)) {
    console.error(`Refusing environment name: ${envName}`);
    process.exit(1);
  }
  return envName;
}

function capture(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || `${cmd} failed`);
    process.exit(result.status ?? 1);
  }
  return (result.stdout || "").trim();
}

function projectId() {
  const file = join(root, ".infisical.json");
  if (!existsSync(file)) {
    console.error("No .infisical.json. Run `infisical login` and `infisical init` in the repo first.");
    process.exit(1);
  }
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  const id = parsed.workspaceId;
  if (!id || typeof id !== "string") {
    console.error(".infisical.json is missing workspaceId.");
    process.exit(1);
  }
  return id;
}

function ensureSharedFolder(envName, id) {
  const result = spawnSync(
    "infisical",
    [
      "secrets",
      "folders",
      "create",
      "--name",
      "shared",
      "--path",
      "/",
      "--env",
      envName,
      "--projectId",
      id,
      "--silent",
    ],
    { cwd: root, encoding: "utf8", shell: false },
  );
  if (result.status === 0) return;
  const detail = `${result.stderr || ""}\n${result.stdout || ""}`;
  if (/already exists/i.test(detail)) return;
  if (result.error) console.error(result.error.message);
  console.error(detail.trim() || "Could not create Infisical folder /shared");
  process.exit(result.status ?? 1);
}

function main() {
  const envName = parseArgs(process.argv);
  const tfDir = join(root, "infra/terraform/envs", envName);
  if (!existsSync(tfDir)) {
    console.error(`No Terraform environment at infra/terraform/envs/${envName}`);
    process.exit(1);
  }

  const chdir = `-chdir=${tfDir}`;
  const pairs = OUTPUT_KEYS.map(([outputName, secretName]) => {
    const value = capture("terraform", [chdir, "output", "-raw", outputName]);
    if (!value) {
      console.error(`terraform output ${outputName} was empty in ${envName}`);
      process.exit(1);
    }
    console.log(`${secretName}=${value}`);
    return `${secretName}=${value}`;
  });

  const id = projectId();
  ensureSharedFolder(envName, id);

  const result = spawnSync(
    "infisical",
    [
      "secrets",
      "set",
      ...pairs,
      "--env",
      envName,
      "--path",
      "/shared",
      "--projectId",
      id,
      "--silent",
    ],
    { cwd: root, stdio: "inherit", shell: false },
  );
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log(`Wrote ${pairs.length} Terraform outputs to Infisical /shared (${envName}).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
