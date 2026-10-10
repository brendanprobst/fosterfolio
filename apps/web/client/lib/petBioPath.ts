import { PET_BIO_SENTINEL_ID } from "@client/lib/constants/petBioSentinel";
import { handleHref } from "@client/lib/userProfilePath";
import { normalizeAppPathname } from "@client/lib/normalizeAppPathname";

export function petHref(ownerIdOrHandle: string, petId: string): string {
  return `${handleHref(ownerIdOrHandle)}/pet/${petId}`;
}

/** Pet bio opened from a foster-me preview card. The bio consumes and strips `via`. */
export function petHrefFromFosterMe(ownerIdOrHandle: string, petId: string): string {
  return `${petHref(ownerIdOrHandle, petId)}?via=foster-me`;
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
  return petIdFromPetPath(pathname, null);
}

/** Pet id from the bio path, or from `/links` or `/analytics` under it. */
export function petIdFromPetPath(
  pathname: string | null | undefined,
  section: "links" | "analytics" | null,
): string | null {
  const path = normalizeAppPathname(pathname);
  const suffix = section ? `\\/${section}` : "";
  const match = path.match(new RegExp(`^\\/@[^/]+\\/pet\\/([^/]+)${suffix}\\/?$`));
  if (!match?.[1]) return null;
  const id = match[1];
  if (id === PET_BIO_SENTINEL_ID) return null;
  return id;
}
