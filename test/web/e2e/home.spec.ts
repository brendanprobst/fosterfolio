import { expect, test } from "@playwright/test";

test("home shows the public feed", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Feed" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Search" })).toBeVisible();
});
