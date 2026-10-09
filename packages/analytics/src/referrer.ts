/**
 * Referrer host → channel. Anything else, including a missing referrer, is direct.
 * instagram.com → instagram
 * facebook.com and l.facebook.com → facebook
 * tiktok.com → tiktok
 * google.* → search
 */
export function channelKeyFromHostname(hostname: string): string {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host) return "direct";
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
  if (
    host === "facebook.com" ||
    host === "l.facebook.com" ||
    host.endsWith(".facebook.com")
  ) {
    return "facebook";
  }
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
  if (isGoogleHost(host)) return "search";
  return "direct";
}

/** google.com, www.google.co.uk, google.com.au — not lookalike hosts. */
function isGoogleHost(host: string): boolean {
  const labels = host.split(".");
  const index = labels.lastIndexOf("google");
  if (index < 0 || index === labels.length - 1) return false;
  const suffix = labels.slice(index + 1).join(".");
  return /^(?:[a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(suffix);
}

export function referrerAttribution(referrer: string | null | undefined): {
  channelKey: string;
  referrerDomain: string | null;
} {
  const raw = referrer?.trim() ?? "";
  if (!raw) return { channelKey: "direct", referrerDomain: null };
  try {
    const hostname = new URL(raw).hostname;
    if (!hostname) return { channelKey: "direct", referrerDomain: null };
    return {
      channelKey: channelKeyFromHostname(hostname),
      referrerDomain: hostname.toLowerCase(),
    };
  } catch {
    return { channelKey: "direct", referrerDomain: null };
  }
}
