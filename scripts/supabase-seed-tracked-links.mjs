#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const result = spawnSync(
  process.execPath,
  [join(here, "supabase-master-seed.mjs"), ...process.argv.slice(2), "--feature", "tracked-links"],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
