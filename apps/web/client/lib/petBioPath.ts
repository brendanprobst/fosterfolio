import { PET_BIO_SENTINEL_ID } from "@client/lib/constants/petBioSentinel";
import { normalizeAppPathname } from "@client/lib/normalizeAppPathname";

export function petBioHref(id: string): string {
  return `/pets/${id}`;
}

/**
 * Extract the pet id from a `/pets/{id}` pathname (after static-export normalization).
 * Returns null for the sentinel placeholder or malformed paths.
 */
export function petIdFromPathname(pathname: string | null | undefined): string | null {
  const path = normalizeAppPathname(pathname);
  const match = path.match(/^\/pets\/([^/]+)\/?$/);
  if (!match?.[1]) return null;
  const id = match[1];
  if (id === PET_BIO_SENTINEL_ID) return null;
  return id;
}
