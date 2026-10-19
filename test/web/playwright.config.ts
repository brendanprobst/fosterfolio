import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { createE2eAccessToken } from "./e2e/support/createE2eAccessToken";
import { E2E_JWT_ISSUER, E2E_JWT_SECRET } from "./e2e/support/e2eAuthConstants";

/** Repo root when tests are started via `npm run test:web:e2e` from the monorepo root. */
const repoRoot = process.cwd();
const e2eToken = createE2eAccessToken();
/** Dedicated ports so Playwright never reuses a local `npm run dev` stack (that is not `LATTICE_E2E`). */
const e2eApiPort = 3100;
const e2eWebPort = 3101;
const e2eApiOrigin = `http://127.0.0.1:${e2eApiPort}`;
const e2eWebOrigin = `http://127.0.0.1:${e2eWebPort}`;

/**
 * One stack for all E2E: API (in-memory repositories + HS256 JWT) + Next.js (synthetic E2E session).
 * Auth-guard tests sign out first, then assert redirects (see `auth-guard.spec.ts`).
 */
export default defineConfig({
  testDir: path.join(repoRoot, "test/web/e2e"),
  outputDir: path.join(repoRoot, "test/web/test-results"),
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: e2eWebOrigin,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run dev -w @lattice/api",
      cwd: repoRoot,
      url: e2eApiOrigin,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        PORT: String(e2eApiPort),
        // Force in-memory repositories (see `Container`): do not inherit a dev machine's Supabase from `.env`.
        SUPABASE_URL: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
        SUPABASE_JWT_SECRET: E2E_JWT_SECRET,
        SUPABASE_JWT_ISSUER: E2E_JWT_ISSUER,
        SUPABASE_JWT_AUDIENCE: "authenticated",
        CORS_ORIGINS: `${e2eWebOrigin},http://localhost:${e2eWebPort}`,
        LATTICE_E2E: "1",
      },
    },
    {
      command: `npx next dev --turbopack -p ${e2eWebPort}`,
      cwd: path.join(repoRoot, "apps/web"),
      url: e2eWebOrigin,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        // Separate build dir so this server never clobbers `.next` under a running `npm run dev`.
        NEXT_DIST_DIR: ".next-e2e",
        NEXT_PUBLIC_API_URL: e2eApiOrigin,
        NEXT_PUBLIC_LATTICE_E2E: "1",
        NEXT_PUBLIC_LATTICE_E2E_ACCESS_TOKEN: e2eToken,
      },
    },
  ],
});
