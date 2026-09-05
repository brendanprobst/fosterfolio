import { USER_PROFILE_SENTINEL_ID } from "@client/lib/constants/userProfileSentinel";
import { normalizeAppPathname } from "@client/lib/normalizeAppPathname";

export function userProfileHref(id: string): string {
  return `/users/${id}`;
}

/**
 * Extract the user id from a `/users/{id}` pathname (after static-export normalization).
 * Returns null for the sentinel placeholder or malformed paths.
 */
export function userIdFromPathname(pathname: string | null | undefined): string | null {
  const path = normalizeAppPathname(pathname);
  const match = path.match(/^\/users\/([^/]+)\/?$/);
  if (!match?.[1]) return null;
  const id = match[1];
  if (id === USER_PROFILE_SENTINEL_ID) return null;
  return id;
}
