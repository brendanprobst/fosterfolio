import { PET_BIO_SENTINEL_ID } from "@client/lib/constants/petBioSentinel";
import { handleHref } from "@client/lib/userProfilePath";
import { normalizeAppPathname } from "@client/lib/normalizeAppPathname";

export function petHref(ownerIdOrHandle: string, petId: string): string {
  return `${handleHref(ownerIdOrHandle)}/pet/${petId}`;
}

/** @deprecated use petHref(ownerIdOrHandle, petId). */
export function petBioHref(ownerIdOrHandle: string, petId: string): string {
  return petHref(ownerIdOrHandle, petId);
}

/**
 * Extract the pet id from a vanity pet path (after static-export normalization).
 * The leading handle segment is decorative and is not validated.
 */
export function petIdFromPathname(
  pathname: string | null | undefined,
): string | null {
  const path = normalizeAppPathname(pathname);
  const match = path.match(/^\/@[^/]+\/pet\/([^/]+)\/?$/);
  if (!match?.[1]) return null;
  const id = match[1];
  if (id === PET_BIO_SENTINEL_ID) return null;
  return id;
}
