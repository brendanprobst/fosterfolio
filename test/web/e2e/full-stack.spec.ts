import { expect, test } from "@playwright/test";
import { E2E_PATHS } from "./support/e2ePaths";
import { E2E_SEED } from "./support/e2eSeedConstants";
import { staySignedIn } from "./support/e2eSession";

/**
 * Full-stack checks (same Playwright config as auth-guard: API + web, synthetic JWT).
 * Product coverage lives in `product.spec.ts`; this file keeps a thin profile smoke.
 */
test.describe("full stack (profile)", () => {
  test.beforeEach(async ({ page }) => {
    await staySignedIn(page);
  });

  test("profile loads the seeded foster from the API", async ({ page }) => {
    await page.goto("/profile");

    await expect(
      page.getByRole("heading", { level: 1, name: E2E_SEED.userDisplayName }),
    ).toBeVisible();
    await expect(page.getByText("Sharing your profile")).toBeVisible();
    await expect(page.getByText(E2E_SEED.petName)).toBeVisible();
    await expect(page.getByRole("link", { name: "View bio" })).toHaveAttribute(
      "href",
      E2E_PATHS.petBio,
    );
  });
});
