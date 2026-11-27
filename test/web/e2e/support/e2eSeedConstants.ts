/**
 * Must stay aligned with `E2E_SEED` in `apps/api/infrastructure/e2eSeed.ts`.
 * Kept here so Playwright does not compile API `@api/*` modules.
 */
export const E2E_SEED = {
  userId: "e2e-playwright-user",
  userEmail: "e2e-playwright@example.com",
  userDisplayName: "Alex Foster",
  petId: "11111111-1111-1111-1111-111111111111",
  petName: "Mochi",
  generalPostBody: "Hello from the foster feed",
  petUpdateBody: "Mochi learned a new trick today.",
  renamedUserId: "e2e-renamed-user",
  renamedUserEmail: "e2e-renamed@example.com",
  renamedUserDisplayName: "Casey Renamed",
  renamedUserHandle: "casey-now",
  renamedUserFormerHandle: "casey-before",
} as const;
