import { E2E_SEED } from "./e2eSeedConstants";

const userRef = E2E_SEED.userId;

export const E2E_PATHS = {
  userRef,
  petBio: `/@${userRef}/pet/${E2E_SEED.petId}`,
  publicProfile: `/@${userRef}`,
  fosterMe: `/@${userRef}/foster-me`,
} as const;
