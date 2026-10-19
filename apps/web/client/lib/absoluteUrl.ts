/** Absolute URL for a same-origin path. Empty origin during SSR. */
export function absoluteUrl(path: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${path}`;
}
