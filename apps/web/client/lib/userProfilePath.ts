import { USER_PROFILE_SENTINEL_ID } from "@client/lib/constants/userProfileSentinel";
import { normalizeAppPathname } from "@client/lib/normalizeAppPathname";

export function handleHref(handleOrId: string): string {
  const raw = handleOrId.replace(/^@+/, "");
  return `/@${raw}`;
}

export function userProfileHref(handleOrId: string): string {
  return handleHref(handleOrId);
}

export function fosterMeHref(handleOrId: string): string {
  return `${handleHref(handleOrId)}/foster-me`;
}

export function publicHandle(user: {
  id: string;
  handle?: string | null;
}): string {
  return user.handle || user.id;
}

/**
 * Extract the handle or uuid from a vanity profile, foster-me, or pet path.
 * Returns null for the static-export sentinel.
 */
export function handleFromPathname(
  pathname: string | null | undefined,
): string | null {
  const path = normalizeAppPathname(pathname);
  const match = path.match(/^\/@([^/]+)/);
  if (!match?.[1]) return null;
  const handle = match[1];
  if (handle === USER_PROFILE_SENTINEL_ID) return null;
  return handle;
}

/** @deprecated use handleFromPathname — kept as an alias for existing imports. */
export function userIdFromPathname(
  pathname: string | null | undefined,
): string | null {
  return handleFromPathname(pathname);
}
