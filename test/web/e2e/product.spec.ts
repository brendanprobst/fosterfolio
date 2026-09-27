import { expect, test } from "@playwright/test";
import { E2E_USER_EMAIL, E2E_USER_ID } from "./support/e2eAuthConstants";
import { E2E_SEED } from "./support/e2eSeedConstants";

test.describe("Fosterfolio product smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.removeItem("lattice-e2e-signed-out");
    });
  });

  test("feed shows the seeded chronological post", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Feed" })).toBeVisible();
    await expect(page.getByText(E2E_SEED.generalPostBody)).toBeVisible();
    await expect(page.getByRole("link", { name: E2E_SEED.petName })).toBeVisible();
  });

  test("search finds the seeded pet and foster", async ({ page }) => {
    await page.goto(`/search?q=${encodeURIComponent(E2E_SEED.petName)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Search" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: new RegExp(E2E_SEED.petName, "i") }),
    ).toHaveAttribute("href", `/@${E2E_SEED.userId}/pet/${E2E_SEED.petId}`);

    await page.goto(`/search?q=${encodeURIComponent("Alex")}`);
    await expect(
      page.getByRole("link", { name: new RegExp(E2E_SEED.userDisplayName, "i") }),
    ).toHaveAttribute("href", `/@${E2E_SEED.userId}`);
  });

  test("pet bio loads from the pathname, sets title, and shows inquiry + QR", async ({
    page,
  }) => {
    await page.goto(`/@${E2E_SEED.userId}/pet/${E2E_SEED.petId}`);
    await expect(
      page.getByRole("heading", { level: 1, name: E2E_SEED.petName }),
    ).toBeVisible();
    await expect(page.getByRole("form", { name: "Contact the foster" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "QR code" })).toBeVisible();
    await expect(page).toHaveTitle(/Mochi/);
  });

  test("public profile shows star control and pets", async ({ page }) => {
    await page.goto(`/@${E2E_SEED.userId}`);
    await expect(
      page.getByRole("heading", { level: 1, name: E2E_SEED.userDisplayName }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Star" })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(E2E_SEED.petName, "i") })).toBeVisible();
  });

  test("inquiry form on the bio page shows success after submit", async ({ page }) => {
    await page.goto(`/@${E2E_SEED.userId}/pet/${E2E_SEED.petId}`);
    await page.getByLabel("Your name").fill("Jamie");
    await page.getByLabel("Your email").fill("jamie@example.com");
    await page.getByLabel("Message").fill("Can I meet Mochi this weekend?");
    await page.getByRole("button", { name: /send inquiry/i }).click();
    await expect(page.getByText("Inquiry sent")).toBeVisible();
  });

  test("signed-in profile editor shows JWT claims and the seeded pet", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByText(E2E_USER_EMAIL)).toBeVisible();
    await expect(page.getByText(E2E_USER_ID)).toBeVisible();
    await expect(page.getByText(E2E_SEED.petName)).toBeVisible();
    await expect(page.getByRole("button", { name: "Save profile" })).toBeVisible();
  });
});
