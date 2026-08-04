/**
 * Static-export placeholder for `app/pets/[id]`.
 * CloudFront viewer-request rewrites `/pets/{anything}` to this object;
 * the browser URL stays `/pets/{realId}` and the page reads the id from the pathname.
 */
export const PET_BIO_SENTINEL_ID = "00000000-0000-0000-0000-000000000000";

/** Match CloudFront rewrite target: `/pets/{PET_BIO_SENTINEL_ID}.html`. */
export const PET_BIO_SENTINEL_OBJECT = `/pets/${PET_BIO_SENTINEL_ID}.html`;
