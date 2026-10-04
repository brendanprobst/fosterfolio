/**
 * Static-export placeholder for the vanity pet-bio route.
 * CloudFront rewrites at-prefixed pet paths to this object; the browser URL
 * stays on the real handle and pet id, which the page reads from the pathname.
 */
export const PET_BIO_SENTINEL_ID = "00000000-0000-0000-0000-000000000000";

export const HANDLE_SENTINEL_SEGMENT = `@${PET_BIO_SENTINEL_ID}`;

/** Match CloudFront rewrite target for the vanity pet-bio sentinel object. */
export const PET_BIO_SENTINEL_OBJECT = `/${HANDLE_SENTINEL_SEGMENT}/pet/${PET_BIO_SENTINEL_ID}.html`;
