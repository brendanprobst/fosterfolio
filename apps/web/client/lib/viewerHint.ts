/**
 * Last signed-in viewer's id + handle, kept in this browser only. Lets a page pick an
 * owner-shaped skeleton on refresh, before Supabase restores the session. A hint, never
 * an auth decision — callers switch to live auth once it resolves.
 */
export type ViewerHint = { id: string; handle: string | null };

const KEY = "fosterfolio:viewer-hint";

export function readViewerHint(): ViewerHint | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ViewerHint>;
    if (typeof parsed.id !== "string" || !parsed.id) return null;
    return { id: parsed.id, handle: typeof parsed.handle === "string" ? parsed.handle : null };
  } catch {
    return null;
  }
}

export function writeViewerHint(hint: ViewerHint): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(hint));
  } catch {
    // Storage blocked (private mode, quota) — the hint is optional.
  }
}

/** Forget the hint once the viewer is known to be signed out (sign-out, expired session). */
export function clearViewerHint(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Storage blocked — nothing stored to clear.
  }
}

/** True when the URL owner segment (id or handle, already normalized) is this viewer. */
export function viewerMatchesOwnerSegment(
  viewer: { id: string; handle: string | null | undefined } | null,
  ownerSegment: string,
): boolean {
  if (!viewer || !ownerSegment) return false;
  return (
    ownerSegment === viewer.id.toLowerCase() ||
    (!!viewer.handle && ownerSegment === viewer.handle.toLowerCase())
  );
}
