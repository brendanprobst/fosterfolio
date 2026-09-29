import { expect, test } from "@playwright/test";
import { E2E_SEED } from "./support/e2eSeedConstants";

/**
 * Do not use `page.addInitScript` to clear `lattice-e2e-signed-out` here — Playwright runs
 * init scripts before every document load (including `reload`), which would erase the flag
 * we set to simulate sign-out.
 */
test("protected routes redirect to sign-in when there is no session", async ({ page }) => {
  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { level: 1, name: E2E_SEED.userDisplayName }),
  ).toBeVisible();

  await page.evaluate(() => {
    sessionStorage.setItem("lattice-e2e-signed-out", "1");
  });
  await page.reload();
  await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 15_000 });

  await page.goto("/profile");
  await expect(page).toHaveURL(/\/auth\/sign-in/);

  // Public routes stay reachable without a session.
  await page.goto("/search");
  await expect(page).toHaveURL(/\/search/);
});
