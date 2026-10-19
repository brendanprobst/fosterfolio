/**
 * Keep supabase/migrations as symlinks to supabase/migrations/feature-migrations.
 * The Supabase CLI only reads the flat migrations directory. The master
 * migration is never linked, so db push cannot apply it.
 */
import { existsSync, lstatSync, mkdirSync, readdirSync, renameSync, symlinkSync, unlinkSync } from "node:fs";
import { join } from "node:path";

export function syncFeatureMigrations(root) {
  const featureDir = join(root, "supabase", "migrations", "feature-migrations");
  const cliDir = join(root, "supabase", "migrations");
  if (!existsSync(featureDir)) return;
  mkdirSync(cliDir, { recursive: true });
  const features = readdirSync(featureDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const expected = new Set(features);
  for (const name of readdirSync(cliDir)) {
    if (!name.endsWith(".sql")) continue;
    const path = join(cliDir, name);
    let stat;
    try {
      stat = lstatSync(path);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink() && !expected.has(name)) unlinkSync(path);
  }
  for (const name of features) {
    const link = join(cliDir, name);
    const target = join("feature-migrations", name);
    let stat = null;
    try {
      stat = lstatSync(link);
    } catch {
      stat = null;
    }
    if (stat?.isSymbolicLink()) unlinkSync(link);
    else if (stat) continue;
    symlinkSync(target, link);
  }
}

/** Move a real SQL file the CLI just wrote into feature-migrations, then relink. */
export function adoptCliMigrations(root) {
  const featureDir = join(root, "supabase", "migrations", "feature-migrations");
  const cliDir = join(root, "supabase", "migrations");
  if (!existsSync(cliDir)) return;
  mkdirSync(featureDir, { recursive: true });
  for (const name of readdirSync(cliDir)) {
    if (!name.endsWith(".sql")) continue;
    const path = join(cliDir, name);
    let stat;
    try {
      stat = lstatSync(path);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) continue;
    renameSync(path, join(featureDir, name));
  }
  syncFeatureMigrations(root);
}
