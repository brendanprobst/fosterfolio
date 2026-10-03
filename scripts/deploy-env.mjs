/**
 * Shared --env handling for deploy-aws.mjs and deploy-aws-web.mjs.
 * Default env is dev so existing commands keep targeting infra/terraform/envs/dev.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ENV_NAME = /^[a-z][a-z0-9-]*$/;

export function takeEnvArg(argv) {
  const rest = [];
  let env = "dev";
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--env") {
      const value = argv[i + 1];
      if (!value || value.startsWith("-")) {
        console.error("--env requires a name (for example: --env prod)");
        process.exit(1);
      }
      env = value;
      i++;
      continue;
    }
    if (arg.startsWith("--env=")) {
      env = arg.slice("--env=".length);
      continue;
    }
    rest.push(arg);
  }
  if (!ENV_NAME.test(env)) {
    console.error(`Invalid --env ${JSON.stringify(env)}. Use a short name like dev or prod.`);
    process.exit(1);
  }
  return { env, argv: rest };
}

export function terraformDir(root, env) {
  const tfDir = join(root, "infra/terraform/envs", env);
  if (!existsSync(tfDir)) {
    console.error(`No Terraform env at infra/terraform/envs/${env}`);
    process.exit(1);
  }
  return tfDir;
}

function readEnvFile(full) {
  const values = {};
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
    values[key] = val;
  }
  return values;
}

function assignUnset(values) {
  for (const [key, val] of Object.entries(values)) {
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

/**
 * Dev keeps today's files (`.env.production.local`, then `.env.local`).
 * Any other env reads only `apps/web/.env.<env>.local` and overwrites
 * NEXT_PUBLIC_SUPABASE_* so a dev shell or `.env.local` cannot leak into that build.
 */
export function loadWebEnv(root, env) {
  if (env === "dev") {
    for (const rel of ["apps/web/.env.production.local", "apps/web/.env.local"]) {
      const full = join(root, rel);
      if (existsSync(full)) assignUnset(readEnvFile(full));
    }
    return;
  }

  const rel = `apps/web/.env.${env}.local`;
  const full = join(root, rel);
  if (!existsSync(full)) {
    console.error(
      `Refusing to build the ${env} site from apps/web/.env.local.\n` +
        `Create ${rel} with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for that project.`,
    );
    process.exit(1);
  }
  const values = readEnvFile(full);
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
    if (!values[key]?.trim()) {
      console.error(`${rel} is missing ${key}.`);
      process.exit(1);
    }
    process.env[key] = values[key];
  }
}
