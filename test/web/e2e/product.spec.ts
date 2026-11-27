import { expect, test, type Locator, type Page } from "@playwright/test";
import { E2E_PATHS } from "./support/e2ePaths";
import { E2E_SEED } from "./support/e2eSeedConstants";
import { browseAsGuest, staySignedIn } from "./support/e2eSession";

async function openPetBioInquiry(page: Page) {
  await page.getByRole("button", { name: `Ask about ${E2E_SEED.petName}` }).click();
  return page.getByRole("dialog");
}

async function submitInquiry(scope: Page | Locator) {
  await scope.getByLabel("Your name").fill("Jamie");
  await scope.getByLabel("Your email").fill("jamie@example.com");
  await scope.getByLabel("Message").fill("Can I meet Mochi this weekend?");
  await scope.getByRole("button", { name: /send inquiry/i }).click();
  await expect(scope.getByText("Inquiry sent")).toBeVisible();
  await expect(
    scope.getByRole("alert").getByText(`${E2E_SEED.userDisplayName} will get your message by email`),
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
      const dialog = await openPetBioInquiry(page);
      await expect(dialog.getByRole("form", { name: "Contact the foster" })).toBeVisible();
      await expect(page.getByRole("button", { name: "QR code" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /fostering now/i })).toHaveCount(0);
      await expect(page).toHaveTitle(/Mochi/);
    });

    test("inquiry form on the bio page shows success after submit", async ({ page }) => {
      await page.goto(E2E_PATHS.petBio);
      await submitInquiry(await openPetBioInquiry(page));
    });

    test("opening the bio inquiry keeps a draft and submits from the sheet", async ({
      page,
    }) => {
      await page.goto(E2E_PATHS.petBio);
      const ask = page.getByRole("button", { name: `Ask about ${E2E_SEED.petName}` });
      await ask.click();
      let dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("form", { name: "Contact the foster" })).toBeVisible();
      await dialog.getByLabel("Your name").fill("Jamie");
      await dialog.getByRole("button", { name: "Close" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await ask.click();
      dialog = page.getByRole("dialog");
      await expect(dialog.getByLabel("Your name")).toHaveValue("Jamie");
      await dialog.getByLabel("Your email").fill("jamie@example.com");
      await dialog.getByLabel("Message").fill("Can I meet Mochi this weekend?");
      await dialog.getByRole("button", { name: /send inquiry/i }).click();
      await expect(dialog.getByText("Inquiry sent")).toBeVisible();
      await expect(
        dialog.getByRole("alert").getByText(`${E2E_SEED.userDisplayName} will get your message by email`),
      ).toBeVisible();
    });

    test("inquiry form on the public profile shows success after submit", async ({
      page,
    }) => {
      await page.goto(E2E_PATHS.publicProfile);
      await submitInquiry(page);
    });

    test("foster-me preview opens the pet bio", async ({ page }) => {
      await page.goto(E2E_PATHS.fosterMe);
      await expect(page.getByRole("form", { name: /contact the foster/i })).toHaveCount(0);
      const card = page.getByRole("link", { name: E2E_SEED.petName });
      await expect(card).toHaveAttribute("href", new RegExp(`/pet/${E2E_SEED.petId}\\?via=foster-me$`));
      await card.click();
      await expect(
        page.getByRole("heading", { level: 1, name: E2E_SEED.petName }),
      ).toBeVisible();
      // The bio records the mark, then strips the one-shot param so it isn't shared onward.
      await expect(page).toHaveURL(new RegExp(`/pet/${E2E_SEED.petId}$`));
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
        page.getByRole("heading", { level: 1, name: `Meet ${E2E_SEED.petName}` }),
      ).toBeVisible();
      await expect(page.getByText(`fostered by ${E2E_SEED.userDisplayName}`)).toBeVisible();
      await expect(page.getByRole("link", { name: E2E_SEED.petName })).toHaveAttribute(
        "href",
        `/@${E2E_PATHS.userRef}/pet/${E2E_SEED.petId}?via=foster-me`,
      );
      await expect(page.getByRole("form", { name: "Contact the foster" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Expand" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "QR code" })).toHaveCount(0);
      await expect(page.getByText('"Foster Me" Link')).toHaveCount(0);
      await expect(page).toHaveTitle(/Foster me/);
    });
  });

  test.describe("guest following a former handle", () => {
    test.beforeEach(async ({ page }) => {
      await browseAsGuest(page);
    });

    test("a former handle's profile URL lands on the current handle", async ({ page }) => {
      await page.goto(`/@${E2E_SEED.renamedUserFormerHandle}`);

      await expect(page).toHaveURL(new RegExp(`/@${E2E_SEED.renamedUserHandle}/?$`));
      await expect(
        page.getByRole("heading", { level: 1, name: E2E_SEED.renamedUserDisplayName }),
      ).toBeVisible();
    });

    test("a former handle's foster-me URL lands on the same page under the current handle", async ({
      page,
    }) => {
      await page.goto(`/@${E2E_SEED.renamedUserFormerHandle}/foster-me`);

      await expect(page).toHaveURL(
        new RegExp(`/@${E2E_SEED.renamedUserHandle}/foster-me/?$`),
      );
    });
  });

  test.describe("guest on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test.beforeEach(async ({ page }) => {
      await browseAsGuest(page);
    });

    test("pet bio inquiry can be sent from the floating button", async ({ page }) => {
      await page.goto(E2E_PATHS.petBio);
      const dialog = await openPetBioInquiry(page);
      const form = dialog.getByRole("form", { name: "Contact the foster" });
      await expect(form).toBeVisible();
      await form.getByLabel("Your name").fill("Jamie");
      await form.getByLabel("Your email").fill("jamie@example.com");
      await form.getByLabel("Message").fill("Can I meet Mochi this weekend?");
      await form.getByRole("button", { name: /send inquiry/i }).click();
      await expect(dialog.getByText("Inquiry sent")).toBeVisible();
      await expect(
        dialog.getByRole("alert").getByText(`${E2E_SEED.userDisplayName} will get your message by email`),
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
      await expect(
        page.getByRole("region", { name: "Your tools" }).getByRole("link", { name: "Links & QR codes" }),
      ).toBeVisible();
      await expect(page.getByText("Sharing your profile")).toHaveCount(0);
      await expect(page.getByText("Private editor")).toHaveCount(0);
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

    test("owner sees the pet's analytics link instead of the pet-bio QR card", async ({ page }) => {
      await page.goto(E2E_PATHS.petBio);
      await expect(page.getByRole("link", { name: "Edit bio" })).toHaveAttribute(
        "href",
        `/profile/pets/edit?petId=${E2E_SEED.petId}&from=${encodeURIComponent(E2E_PATHS.petBio)}`,
      );
      await expect(page.getByRole("form", { name: /contact the foster/i })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /send inquiry/i })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "QR code" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Links & analytics" })).toHaveCount(0);
      await page.getByRole("link", { name: "View analytics" }).click();
      await expect(page).toHaveURL(new RegExp(`${E2E_PATHS.petBio}/analytics/?$`));
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

    test("guest inquiry shows in the owner inbox and can be archived", async ({ page }) => {
      const sender = "Riley Quinn";
      const message = "Inbox archive path for Mochi";

      await browseAsGuest(page);
      await page.goto(E2E_PATHS.petBio);
      const dialog = await openPetBioInquiry(page);
      await dialog.getByLabel("Your name").fill(sender);
      await dialog.getByLabel("Your email").fill("riley.quinn@example.com");
      await dialog.getByLabel("Message").fill(message);
      await dialog.getByRole("button", { name: /send inquiry/i }).click();
      await expect(dialog.getByText("Inquiry sent")).toBeVisible();

      await staySignedIn(page);
      await page.goto("/inbox");
      const messagePane = page.getByRole("region", { name: "Message", exact: true });
      await page.getByRole("button", { name: new RegExp(sender) }).click();
      await expect(messagePane.getByText(message)).toBeVisible();
      await expect(messagePane.getByRole("link", { name: "riley.quinn@example.com" })).toBeVisible();
      await messagePane.getByRole("button", { name: "Archive" }).click();
      await expect(page.getByRole("button", { name: new RegExp(sender) })).toHaveCount(0);

      await page.getByRole("button", { name: "Archived" }).click();
      await expect(page.getByRole("button", { name: new RegExp(sender) })).toBeVisible();
    });

    test("links page: first-run tutorial, then an Instagram link", async ({ page }) => {
      await page.goto("/profile/links");
      await expect(
        page.getByRole("heading", { level: 1, name: "Links & QR codes" }),
      ).toBeVisible();
      await expect(page.getByRole("region", { name: "No links yet" })).toBeVisible();

      await page.getByRole("button", { name: "Create link" }).click();
      const create = page.getByRole("dialog");
      await expect(create.getByRole("button", { name: "Instagram" })).toBeDisabled();
      await create.getByRole("button", { name: /create first link/i }).click();

      const intro = page.getByRole("dialog");
      await expect(intro.getByText("This is your default link to the pets you foster.")).toBeVisible();
      await intro.getByRole("button", { name: "Next" }).click();
      await intro.getByRole("button", { name: "Got it" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);

      const defaultRow = page.getByRole("article", {
        name: `${E2E_SEED.userDisplayName}'s default link`,
      });
      await expect(defaultRow).toBeVisible();
      await expect(defaultRow.getByText("Default", { exact: true })).toBeVisible();
      await expect(page.getByRole("article", { name: "Untagged visits" })).toBeVisible();
      await expect(page.getByRole("region", { name: "No links yet" })).toHaveCount(0);

      await page.getByRole("button", { name: "Create link" }).click();
      const normal = page.getByRole("dialog");
      await expect(normal.getByLabel("Custom channel")).toBeEnabled();
      await normal.getByRole("button", { name: "Instagram" }).click();
      await normal.getByLabel(/label/i).fill("Story highlight");
      await normal.getByRole("button", { name: "Create link" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);

      const instagram = page.getByRole("article", { name: "Story highlight" });
      await expect(instagram).toBeVisible();
      await expect(instagram.getByText("Instagram")).toBeVisible();
      await expect(instagram.getByRole("img", { name: "QR code for Story highlight" })).toBeVisible();
    });

    test("owner foster-me shows the preview and manage links", async ({ page }) => {
      await page.goto(E2E_PATHS.fosterMe);
      await expect(page).toHaveURL(/\/foster-me\/?$/);
      await expect(
        page.getByRole("heading", { level: 1, name: `Meet ${E2E_SEED.petName}` }),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "Manage links" })).toHaveAttribute(
        "href",
        "/profile/links",
      );
      await expect(page.getByRole("form", { name: /contact the foster/i })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /send inquiry/i })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "QR code" })).toHaveCount(0);
      await expect(page.getByText('"Foster Me" Link')).toHaveCount(0);
    });
  });
});
