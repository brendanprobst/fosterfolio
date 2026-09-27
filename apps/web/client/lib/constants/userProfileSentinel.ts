import { HANDLE_SENTINEL_SEGMENT, PET_BIO_SENTINEL_ID } from "./petBioSentinel";

/**
 * Static-export placeholder for the vanity profile route.
 * Same nil UUID as the pet sentinel; CloudFront rewrites at-prefixed profile
 * paths to this object while the browser URL stays on the real handle.
 */
export const USER_PROFILE_SENTINEL_ID = PET_BIO_SENTINEL_ID;

export const USER_PROFILE_SENTINEL_OBJECT = `/${HANDLE_SENTINEL_SEGMENT}.html`;
