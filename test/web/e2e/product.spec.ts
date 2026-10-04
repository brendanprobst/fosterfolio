import { expect, test, type Locator, type Page } from "@playwright/test";
import { E2E_PATHS } from "./support/e2ePaths";
import { E2E_SEED } from "./support/e2eSeedConstants";
import { browseAsGuest, staySignedIn } from "./support/e2eSession";

async function submitInquiry(scope: Page | Locator) {
  await scope.getByLabel("Your name").fill("Jamie");
  await scope.getByLabel("Your email").fill("jamie@example.com");
  await scope.getByLabel("Message").fill("Can I meet Mochi this weekend?");
  await scope.getByRole("button", { name: /send inquiry/i }).click();
  await expect(scope.getByText("Inquiry sent")).toBeVisible();
  await expect(
    scope.getByText(`${E2E_SEED.userDisplayName} will get your message by email`),
  ).toBeVisible();
}

test.describe("Fosterfolio product smoke", () => {
  test.describe("guest", () => {
    test.beforeEach(async ({ page }) => {
      await browseAsGuest(page);
    });

    test("feed and search stay behind product flags", async ({ page }) => {
      await page.goto("/feed");
      await expect(page.getByRole("heading", { level: 1, name: "Feed" })).toBeVisible();
      await expect(page.getByText(/isn.t in this private beta/i)).toBeVisible();
      await expect(page.getByText(E2E_SEED.generalPostBody)).toHaveCount(0);

      await page.goto(`/search?q=${encodeURIComponent(E2E_SEED.petName)}`);
      await expect(page.getByRole("heading", { level: 1, name: "Search" })).toBeVisible();
      await expect(page.getByText(/isn.t in this private beta/i)).toBeVisible();
      await expect(
        page.getByRole("link", { name: new RegExp(E2E_SEED.petName, "i") }),
      ).toHaveCount(0);
    });

    test("pet bio shows foster status and inquiry without a QR", async ({ page }) => {
      await page.goto(E2E_PATHS.petBio);
      await expect(
        page.getByRole("heading", { level: 1, name: E2E_SEED.petName }),
      ).toBeVisible();
      await expect(page.getByText("Fostered by")).toBeVisible();
      await expect(
        page.getByRole("link", { name: E2E_SEED.userDisplayName }),
      ).toHaveAttribute("href", E2E_PATHS.publicProfile);
      await expect(page.getByText(`Actively fostering ${E2E_SEED.petName}`)).toBeVisible();
      await expect(page.getByRole("form", { name: "Contact the foster" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Expand" })).toBeVisible();
      await expect(page.getByRole("button", { name: "QR code" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /fostering now/i })).toHaveCount(0);
      await expect(page).toHaveTitle(/Mochi/);
    });

    test("inquiry form on the bio page shows success after submit", async ({ page }) => {
      await page.goto(E2E_PATHS.petBio);
      await submitInquiry(page);
    });

    test("expanding the bio inquiry keeps a draft and submits from the modal", async ({
      page,
    }) => {
      await page.goto(E2E_PATHS.petBio);
      await page.getByLabel("Your name").fill("Jamie");
      await page.getByRole("button", { name: "Expand" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Contact the foster" })).toBeVisible();
      await expect(dialog.getByLabel("Your name")).toHaveValue("Jamie");
      await dialog.getByLabel("Your email").fill("jamie@example.com");
      await dialog.getByLabel("Message").fill("Can I meet Mochi this weekend?");
      await dialog.getByRole("button", { name: /send inquiry/i }).click();
      await expect(page.getByText("Inquiry sent")).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(
        page.getByText(`${E2E_SEED.userDisplayName} will get your message by email`),
      ).toBeVisible();
    });

    test("inquiry form on the public profile shows success after submit", async ({
      page,
    }) => {
      await page.goto(E2E_PATHS.publicProfile);
      await submitInquiry(page);
    });

    test("inquiry form on foster-me shows success after submit", async ({ page }) => {
      await page.goto(E2E_PATHS.fosterMe);
      await submitInquiry(page);
    });

    test("public profile shows guest sidebar and pets", async ({ page }) => {
      await page.goto(E2E_PATHS.publicProfile);
      await expect(
        page.getByRole("heading", { level: 1, name: E2E_SEED.userDisplayName }),
      ).toBeVisible();
      await expect(page.getByText("Interested in adopting?")).toBeVisible();
      await expect(page.getByRole("link", { name: /fostering now/i })).toHaveAttribute(
        "href",
        E2E_PATHS.fosterMe,
      );
      await expect(page.getByRole("form", { name: "Contact this foster" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Star" })).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: new RegExp(E2E_SEED.petName, "i") }),
      ).toBeVisible();
      await expect(page.getByText("Your public page")).toHaveCount(0);
    });

    test("foster-me stays on the stable URL and shows the current pet without share", async ({
      page,
    }) => {
      await page.goto(E2E_PATHS.fosterMe);
      await expect(page).toHaveURL(/\/foster-me\/?$/);
      await expect(page).not.toHaveURL(/\/pet\//);
      await expect(
        page.getByRole("heading", { level: 1, name: E2E_SEED.petName }),
      ).toBeVisible();
      await expect(page.getByText(`Actively fostering ${E2E_SEED.petName}`)).toBeVisible();
      await expect(page.getByRole("form", { name: "Contact the foster" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Expand" })).toBeVisible();
      await expect(page.getByRole("button", { name: "QR code" })).toHaveCount(0);
      await expect(page.getByText('"Foster Me" Link')).toHaveCount(0);
      await expect(page).toHaveTitle(/Foster me/);
    });
  });

  test.describe("guest on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test.beforeEach(async ({ page }) => {
      await browseAsGuest(page);
    });

    test("pet bio inquiry can be sent from the side panel", async ({ page }) => {
      await page.goto(E2E_PATHS.petBio);
      const openPanel = page.getByRole("button", {
        name: `Open Ask about ${E2E_SEED.petName}`,
      });
      await expect(openPanel).toBeVisible();
      await openPanel.click();
      const panel = page.getByRole("dialog", { name: `Ask about ${E2E_SEED.petName}` });
      const form = panel.getByRole("form", { name: "Contact the foster" });
      await expect(form).toBeVisible();
      await form.getByLabel("Your name").fill("Jamie");
      await form.getByLabel("Your email").fill("jamie@example.com");
      await form.getByLabel("Message").fill("Can I meet Mochi this weekend?");
      await form.getByRole("button", { name: /send inquiry/i }).click();
      await expect(panel.getByText("Inquiry sent")).toBeVisible();
      await expect(
        panel.getByText(`${E2E_SEED.userDisplayName} will get your message by email`),
      ).toBeVisible();
    });
  });

  test.describe("signed in as the seeded foster", () => {
    test.beforeEach(async ({ page }) => {
      await staySignedIn(page);
    });

    test("profile editor shows the private identity and seeded pet", async ({ page }) => {
      await page.goto("/profile");
      await expect(
        page.getByRole("heading", { level: 1, name: E2E_SEED.userDisplayName }),
      ).toBeVisible();
      await expect(page.getByText("Sharing your profile")).toBeVisible();
      await expect(page.getByText("Private editor")).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Preview Profile Link" })).toHaveAttribute(
        "href",
        E2E_PATHS.publicProfile,
      );
      await expect(
        page.getByRole("link", { name: 'Preview "Foster Me" Link' }),
      ).toHaveAttribute("href", E2E_PATHS.fosterMe);
      await expect(page.getByRole("heading", { name: "Profile Link" })).toBeVisible();
      await expect(page.getByRole("heading", { name: '"Foster Me" Link' })).toBeVisible();
      await expect(page.getByText(E2E_SEED.petName)).toBeVisible();
      await expect(page.getByRole("link", { name: E2E_SEED.petName })).toHaveAttribute(
        "href",
        E2E_PATHS.petBio,
      );
      await page.getByRole("button", { name: "Edit profile" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Edit profile" })).toBeVisible();
      await expect(dialog.getByRole("button", { name: /add image|replace image/i })).toBeVisible();
      await expect(dialog.getByLabel("Display name")).toBeVisible();
      await expect(dialog.getByLabel("Handle")).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Save" })).toBeVisible();
    });

    test("owner can generate a pet-bio QR on demand", async ({ page }) => {
      await page.goto(E2E_PATHS.petBio);
      await expect(page.getByText(`Edit ${E2E_SEED.petName}'s bio`)).toBeVisible();
      await expect(page.getByRole("link", { name: "Edit bio" })).toHaveAttribute(
        "href",
        `/profile/pets/edit?petId=${E2E_SEED.petId}&from=${encodeURIComponent(E2E_PATHS.petBio)}`,
      );
      await expect(page.getByRole("form", { name: /contact the foster/i })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /send inquiry/i })).toHaveCount(0);
      await expect(page.getByRole("img", { name: /QR code/i })).toHaveCount(0);
      await page.getByRole("button", { name: "QR code" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: `${E2E_SEED.petName} QR` })).toBeVisible();
      await expect(dialog.getByRole("img", { name: `QR code for ${E2E_SEED.petName}` })).toBeVisible();
      await expect(dialog.getByRole("button", { name: /download png/i })).toBeVisible();
    });

    test("owner public profile offers edit, not inquiry", async ({ page }) => {
      await page.goto(E2E_PATHS.publicProfile);
      await expect(page.getByText("Your public page")).toBeVisible();
      await expect(page.getByRole("link", { name: "Edit profile" })).toHaveAttribute(
        "href",
        "/profile",
      );
      await expect(
        page.getByRole("link", { name: "Preview 'Foster Me' page" }),
      ).toHaveAttribute("href", E2E_PATHS.fosterMe);
      await expect(page.getByRole("form", { name: "Contact this foster" })).toHaveCount(0);
      await expect(page.getByText("Interested in adopting?")).toHaveCount(0);
    });

    test("owner foster-me shows share without an inquiry form", async ({ page }) => {
      await page.goto(E2E_PATHS.fosterMe);
      await expect(page).toHaveURL(/\/foster-me\/?$/);
      await expect(
        page.getByRole("heading", { level: 1, name: E2E_SEED.petName }),
      ).toBeVisible();
      await expect(page.getByText('"Foster Me" Link')).toBeVisible();
      await expect(page.getByRole("form", { name: /contact the foster/i })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /send inquiry/i })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Expand" })).toHaveCount(0);
      await page.getByRole("button", { name: "QR code" }).click();
      await expect(page.getByRole("heading", { name: "Foster-me QR" })).toBeVisible();
      await expect(page.getByRole("button", { name: /download png/i })).toBeVisible();
    });
  });
});
