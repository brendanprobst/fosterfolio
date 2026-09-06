import { expect, test } from "@playwright/test";
import { E2E_USER_EMAIL, E2E_USER_ID } from "./support/e2eAuthConstants";
import { E2E_SEED } from "./support/e2eSeedConstants";

/**
 * Full-stack checks (same Playwright config as auth-guard: API + web, synthetic JWT).
 * Product coverage lives in `product.spec.ts`; this file keeps the original profile smoke.
 */
test.describe("full stack (profile)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.removeItem("lattice-e2e-signed-out");
    });
  });

  test("profile shows user id and email from JWT and API", async ({ page }) => {
    await page.goto("/profile");

    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByText(E2E_USER_EMAIL)).toBeVisible();
    await expect(page.getByText(E2E_USER_ID)).toBeVisible();
    await expect(page.getByText(E2E_SEED.petName)).toBeVisible();
  });
});
