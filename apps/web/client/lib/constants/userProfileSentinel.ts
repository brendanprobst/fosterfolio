import { PET_BIO_SENTINEL_ID } from "./petBioSentinel";

/**
 * Static-export placeholder for `app/users/[id]`.
 * Same nil UUID as the pet sentinel; CloudFront rewrites `/users/{anything}`
 * to this object while the browser URL stays `/users/{realId}`.
 */
export const USER_PROFILE_SENTINEL_ID = PET_BIO_SENTINEL_ID;
