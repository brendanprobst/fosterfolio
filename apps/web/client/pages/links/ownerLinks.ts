import type { OwnerLinkAnalytics, TrackedLinkItem } from "@client/features/petInsights/types";

/** Reserved channel for the first link (`POST /me/links { isDefault: true }`). */
export const DEFAULT_CHANNEL_KEY = "default";

export const LINK_RANGES = ["7d", "30d", "all"] as const;
export type LinkRange = (typeof LINK_RANGES)[number];

export const RANGE_LABELS: Record<LinkRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
};

export type LinkStats = { previewViews: number; petTaps: number; inquiries: number };

export const ZERO_STATS: LinkStats = { previewViews: 0, petTaps: 0, inquiries: 0 };

export type GroupedLinks = {
  /** Active foster-me links: the default pinned first, then newest first. */
  active: TrackedLinkItem[];
  archived: TrackedLinkItem[];
  /** Pre-5b `target = 'pet'` links, archived or not. */
  legacy: TrackedLinkItem[];
};

function isFosterMe(link: TrackedLinkItem): boolean {
  return link.target === "foster_me";
}

export function isDefaultLink(link: TrackedLinkItem): boolean {
  return isFosterMe(link) && link.channelKey === DEFAULT_CHANNEL_KEY;
}

function newestFirst(a: TrackedLinkItem, b: TrackedLinkItem): number {
  return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
}

export function groupOwnerLinks(links: TrackedLinkItem[]): GroupedLinks {
  const active = links
    .filter((link) => isFosterMe(link) && !link.archivedAt)
    .sort((a, b) => Number(isDefaultLink(b)) - Number(isDefaultLink(a)) || newestFirst(a, b));
  const archived = links.filter((link) => isFosterMe(link) && link.archivedAt).sort(newestFirst);
  const legacy = links.filter((link) => !isFosterMe(link)).sort(newestFirst);
  return { active, archived, legacy };
}

/** First run: the owner has no active foster-me links, so the next one becomes the default. */
export function isFirstRun(links: TrackedLinkItem[]): boolean {
  return groupOwnerLinks(links).active.length === 0;
}

/** Per-link stats keyed by link id; untagged foster-me traffic sits under `null`. */
export function statsByLink(analytics: OwnerLinkAnalytics | undefined): Map<string | null, LinkStats> {
  const map = new Map<string | null, LinkStats>();
  for (const row of analytics?.byLink ?? []) {
    map.set(row.linkId, {
      previewViews: row.previewViews,
      petTaps: row.petTaps,
      inquiries: row.inquiries,
    });
  }
  return map;
}

/** Sparkline length: the range's days, or every day since the first data point for "all". */
export function sparklineDays(range: LinkRange, days: string[], today = new Date()): number {
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  const first = [...days].sort()[0];
  if (!first) return 30;
  const start = Date.parse(`${first}T00:00:00.000Z`);
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const span = Math.floor((end - start) / 86_400_000) + 1;
  return Math.max(7, span);
}
