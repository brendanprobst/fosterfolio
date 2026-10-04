/**
 * Shared with Playwright (Node) and documented for API `webServer` env.
 * API verifies HS256 when `SUPABASE_JWT_SECRET` is set — must match the token
 * minted for the web app’s synthetic E2E session.
 */
export const E2E_JWT_SECRET = "lattice-playwright-e2e-secret";
export const E2E_JWT_ISSUER = "https://e2e.local.supabase/auth/v1";
import { E2E_SEED } from "./e2eSeedConstants";

/** Keep aligned with `E2E_SEED` in `apps/api/infrastructure/e2eSeed.ts`. */
export const E2E_USER_ID = E2E_SEED.userId;
export const E2E_USER_EMAIL = E2E_SEED.userEmail;
