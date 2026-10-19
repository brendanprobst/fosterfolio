#!/usr/bin/env node
/**
 * Wrapper around the Supabase CLI (`supabase` devDependency) so the whole
 * migration loop runs from the monorepo root:
 *
 *   npm run supabase:link
 *   npm run supabase:new -- platform_add_widget_table
 *   npm run supabase:push:dry
 *   npm run supabase:push
 *   npm run supabase:list
 *
 * Why a wrapper instead of calling `supabase` directly from package.json:
 *
 * 1. npm scripts do not read dotenv files. Credentials must stay out of git.
 *    Dev reads the first of `supabase/.env.dev`, `.env.local`, `.env`.
 *    `npm run supabase:push -- --env prod` reads only `supabase/.env.prod`.
 * 2. DDL against `auth.*` and `storage.*` needs the **direct** Postgres
 *    connection, not the transaction pooler. When `SUPABASE_DB_URL` is set it is
 *    forwarded as `--db-url` to every database command.
 * 3. The CLI requires a flat `supabase/migrations/`. This enforces the
 *    `platform_` / `app_` infix so upstream harvest can separate reusable
 *    platform migrations from product ones.
 *
 * See docs/playbooks/supabase-migrations.md.
 */
import { existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { applyEnvFile, envFileLabel, resolveEnvFile, takeEnvArg } from "./env-files.mjs";
import { adoptCliMigrations, syncFeatureMigrations } from "./sync-feature-migrations.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION_PREFIXES = ["platform_", "app_"];

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

function supabaseBin() {
  const local = join(
    root,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "supabase.cmd" : "supabase",
  );
  if (existsSync(local)) return local;
  return "supabase";
}

/** Strip DB passwords / connection URLs from CLI output before printing. */
function redactSecrets(text) {
  if (!text) return text;
  let out = String(text);
  const dbUrl = process.env.SUPABASE_DB_URL?.trim();
  if (dbUrl) out = out.split(dbUrl).join("[SUPABASE_DB_URL]");
  try {
    const pw = dbUrl ? decodeURIComponent(new URL(dbUrl).password || "") : "";
    if (pw) out = out.split(pw).join("***");
  } catch {
    /* ignore malformed URL */
  }
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (token) out = out.split(token).join("[SUPABASE_ACCESS_TOKEN]");
  out = out.replace(
    /postgresql:\/\/[^:\s]+:[^@\s]+@/g,
    "postgresql://***:***@",
  );
  return out;
}

function run(args, { exit = true } = {}) {
  adoptCliMigrations(root);
  syncFeatureMigrations(root);
  const bin = supabaseBin();
  // Capture I/O so we can redact secrets. Never use shell:true — that would
  // expand/$interpolate passwords and print them via npm script echo.
  const r = spawnSync(bin, args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    shell: false,
  });
  if (r.stdout) process.stdout.write(redactSecrets(r.stdout));
  if (r.stderr) process.stderr.write(redactSecrets(r.stderr));
  if (r.error) {
    console.error(`\n  Failed to run Supabase CLI (${r.error.code || "error"}).\n`);
    if (!exit) return 1;
    process.exit(1);
  }
  if (!exit) return r.status ?? 1;
  process.exit(r.status ?? 1);
}

/** Commands that talk to a database and can therefore take `--db-url`. */
function withDbUrl(args) {
  const dbUrl = process.env.SUPABASE_DB_URL?.trim();
  return dbUrl ? [...args, "--db-url", dbUrl] : args;
}

function requireProjectRef() {
  const ref = process.env.SUPABASE_PROJECT_REF?.trim();
  if (!ref) {
    fail(
      `SUPABASE_PROJECT_REF is not set.\n` +
        `  Copy supabase/.env.example to ${ENV_FILE} and fill in your project ref\n` +
        `  (dashboard URL: https://supabase.com/dashboard/project/<project-ref>).`,
    );
  }
  return ref;
}

function migrationName(passthrough) {
  const name = passthrough[0];
  if (!name) {
    fail(
      `Migration name required:\n` +
        `  npm run supabase:new -- platform_add_widget_table\n` +
        `  npm run supabase:new -- app_add_pets_table`,
    );
  }
  if (!MIGRATION_PREFIXES.some((p) => name.startsWith(p))) {
    fail(
      `Migration name must start with "platform_" or "app_" (got "${name}").\n` +
        `  platform_  reusable Lattice infrastructure — harvested upstream into the template\n` +
        `  app_       product schema — stays in this repo\n` +
        `  See docs/playbooks/supabase-migrations.md#migration-naming.`,
    );
  }
  return name;
}

const [command, ...rawArgs] = process.argv.slice(2);
const { env, argv: passthrough } = takeEnvArg(rawArgs);
const envPath = resolveEnvFile(join(root, "supabase"), env);
const ENV_FILE = envPath ? relative(root, envPath) : envFileLabel("supabase", env);

if (env !== "dev" && !envPath) {
  fail(
    `Missing ${envFileLabel("supabase", env)}.\n` +
      `  Put the ${env} project ref and session-pooler URL in that file.\n` +
      `  Leave the dev file in place. Do not rename it.`,
  );
}

if (envPath) {
  applyEnvFile(envPath, { override: env !== "dev" });
  console.log(`→ supabase env ${ENV_FILE}`);
} else if (command !== "help") {
  console.warn(
    `  Note: no dev file at ${ENV_FILE} — relying on the ambient environment ` +
      `and existing CLI link state.`,
  );
}

function passwordFromDbUrl() {
  const dbUrl = process.env.SUPABASE_DB_URL?.trim();
  if (!dbUrl) return undefined;
  try {
    const u = new URL(dbUrl);
    return u.password ? decodeURIComponent(u.password) : undefined;
  } catch {
    return undefined;
  }
}

switch (command) {
  case "link": {
    const args = ["link", "--project-ref", requireProjectRef(), ...passthrough];
    // Prefer an explicit --password; otherwise derive from SUPABASE_DB_URL so
    // the operator never has to paste the DB password on the command line.
    if (!passthrough.includes("--password")) {
      const pw = passwordFromDbUrl();
      if (pw) args.push("--password", pw);
    }
    run(args);
    break;
  }
  case "new": {
    const status = run(["migration", "new", migrationName(passthrough)], { exit: false });
    adoptCliMigrations(root);
    process.exit(status ?? 1);
  }
  case "push:dry":
    run(withDbUrl(["db", "push", "--dry-run", ...passthrough]));
    break;
  case "push": {
    const armed = ["1", "true", "yes"].includes(
      String(process.env.SUPABASE_PUSH_ENABLED ?? "").trim().toLowerCase(),
    );
    if (!armed) {
      fail(
        `Refusing to push. Schema push is disarmed.\n` +
          `  Set SUPABASE_PUSH_ENABLED=1 in ${ENV_FILE}, run the push, then set it back to 0.`,
      );
    }
    run(withDbUrl(["db", "push", ...passthrough]));
    break;
  }
  case "list":
    run(withDbUrl(["migration", "list", ...passthrough]));
    break;
  case "handshake": {
    // Re-auth against the project in the selected env file.
    // Prints pass/fail — never echoes the password or full DB URL.
    const ref = requireProjectRef();
    const dbUrl = process.env.SUPABASE_DB_URL?.trim();
    if (!dbUrl) {
      fail(`SUPABASE_DB_URL missing in ${ENV_FILE}`);
    }
    let host = "(unparseable)";
    let user = "(unparseable)";
    try {
      const u = new URL(dbUrl);
      host = u.hostname;
      user = decodeURIComponent(u.username || "");
    } catch {
      fail(`SUPABASE_DB_URL in ${ENV_FILE} is not a valid URL`);
    }
    console.log(`Handshake for project ${ref}`);
    console.log(`  host: ${host}`);
    console.log(`  user: ${user}`);
    console.log("  linking…");
    const pw = passwordFromDbUrl();
    const linkArgs = ["link", "--project-ref", ref];
    if (pw) linkArgs.push("--password", pw);
    adoptCliMigrations(root);
    syncFeatureMigrations(root);
    const link = spawnSync(supabaseBin(), linkArgs, {
      cwd: root,
      encoding: "utf8",
      env: process.env,
      shell: false,
    });
    if (link.stdout) process.stdout.write(redactSecrets(link.stdout));
    if (link.stderr) process.stderr.write(redactSecrets(link.stderr));
    if (link.status !== 0) {
      console.error("\n  Handshake FAILED at link step.\n");
      process.exit(link.status ?? 1);
    }
    console.log("  listing migrations…");
    const list = spawnSync(
      supabaseBin(),
      withDbUrl(["migration", "list"]),
      {
        cwd: root,
        encoding: "utf8",
        env: process.env,
        shell: false,
      },
    );
    if (list.stdout) process.stdout.write(redactSecrets(list.stdout));
    if (list.stderr) process.stderr.write(redactSecrets(list.stderr));
    if (list.status !== 0) {
      console.error("\n  Handshake FAILED at migration list (DB auth).\n");
      process.exit(list.status ?? 1);
    }
    console.log("\n  Handshake OK — link + DB auth succeeded.\n");
    process.exit(0);
  }
  default:
    fail(
      `Unknown command "${command ?? ""}". Available:\n` +
        `  npm run supabase:link\n` +
        `  npm run supabase:new -- <platform_|app_><name>\n` +
        `  npm run supabase:push:dry\n` +
        `  npm run supabase:push\n` +
        `  npm run supabase:list\n` +
        `  npm run supabase:handshake\n` +
        `  Add --env prod to any command to read supabase/.env.prod.`,
    );
}
