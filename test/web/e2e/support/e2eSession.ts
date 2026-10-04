import type { Page } from "@playwright/test";

const SIGNED_OUT_KEY = "lattice-e2e-signed-out";

/**
 * Guest browsing: the minted JWT stays in env, but `E2eAuthProvider` treats the
 * session as signed out (`sessionStorage`).
 */
export async function browseAsGuest(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    sessionStorage.setItem(key, "1");
  }, SIGNED_OUT_KEY);
}

/** Default Playwright session: signed in as the seeded foster. */
export async function staySignedIn(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    sessionStorage.removeItem(key);
  }, SIGNED_OUT_KEY);
}
