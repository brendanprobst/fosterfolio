import { USER_PROFILE_SENTINEL_ID } from "@client/lib/constants/userProfileSentinel";
import { normalizeAppPathname } from "@client/lib/normalizeAppPathname";

/** Same normalize as the API `UserHandle.normalize` — trim, strip @, lowercase. */
export function normalizeHandleInput(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export type HandleEditKind = "none" | "claim" | "rename" | "clear";

export type HandleEditDelta = {
  next: string | null;
  changed: boolean;
  kind: HandleEditKind;
};

/** Compare a draft handle field to the stored slug. */
export function handleEditDelta(
  current: string | null | undefined,
  draft: string,
): HandleEditDelta {
  const nextRaw = normalizeHandleInput(draft);
  const next = nextRaw || null;
  const prev = current || null;
  if (next === prev) return { next, changed: false, kind: "none" };
  if (!prev && next) return { next, changed: true, kind: "claim" };
  if (prev && !next) return { next, changed: true, kind: "clear" };
  return { next, changed: true, kind: "rename" };
}

export function handleEditConfirmMessage(
  kind: HandleEditKind,
  current: string | null | undefined,
  next: string | null,
): string | null {
  if (kind === "clear" && current) {
    return `/@${current} will still open your profile, but you won't have a public handle. Clear this handle?`;
  }
  if (kind === "rename" && current && next) {
    return `/@${current} will keep redirecting to your profile, and no one else can claim it. Change it to /@${next}?`;
  }
  return null;
}

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

/** Foster-me URL tagged with a tracked-link code (`?s=`). */
export function fosterMeLinkHref(handleOrId: string, code: string): string {
  return `${fosterMeHref(handleOrId)}?s=${encodeURIComponent(code)}`;
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

/**
 * Where to send the browser when a profile URL used a former handle: the same
 * sub-path and query under the canonical handle. Null when no redirect is needed.
 */
export function canonicalProfilePath(
  pathname: string | null | undefined,
  canonicalHandle: string | null | undefined,
  search = "",
): string | null {
  if (!canonicalHandle) return null;
  const current = handleFromPathname(pathname);
  if (!current || current === canonicalHandle) return null;
  const path = normalizeAppPathname(pathname);
  return `/@${canonicalHandle}${path.slice(`/@${current}`.length)}${search}`;
}
