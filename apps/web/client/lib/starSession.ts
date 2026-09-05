const TOKEN_KEY = "fosterfolio.starSessionToken";
const STARRED_KEY = "fosterfolio.starredUserIds";

function readStarredIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STARRED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

/** Stable anonymous token for `POST /users/:id/star` (session_token dedup). */
export function getStarSessionToken(): string {
  if (typeof window === "undefined") return "";
  let token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    window.localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export function hasStarredUser(userId: string): boolean {
  return readStarredIds().includes(userId);
}

export function markUserStarred(userId: string): void {
  if (typeof window === "undefined") return;
  const next = new Set(readStarredIds());
  next.add(userId);
  window.localStorage.setItem(STARRED_KEY, JSON.stringify([...next]));
}
