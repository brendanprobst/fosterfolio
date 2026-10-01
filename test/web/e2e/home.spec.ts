import { expect, test } from "@playwright/test";

test("home explains Fosterfolio and hides feed and search", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Fosterfolio" })).toBeVisible();
  await expect(page.getByText(/public pet bios and qr/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Feed" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Search" })).toHaveCount(0);
});
