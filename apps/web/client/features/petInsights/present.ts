import type { ChannelOption, PetAnalytics, PetAnalyticsSummary, TrackedLinkItem } from "./types";

export function channelDisplayName(
  channelKey: string,
  channels: ChannelOption[],
  links: Array<{ channelKey: string; channelName: string }> = [],
): string {
  if (channelKey === "direct") return "Direct / original QR";
  return (
    links.find((link) => link.channelKey === channelKey)?.channelName ??
    channels.find((channel) => channel.key === channelKey)?.name ??
    channelKey
  );
}

export type ViewBucket = { label: string; views: number };

/** Weekly buckets when fewer than 14 days have views. */
export function bucketViewsByDay(points: Array<{ day: string; views: number }>): {
  grain: "day" | "week";
  points: ViewBucket[];
} {
  const daysWithViews = points.filter((point) => point.views > 0).length;
  if (daysWithViews >= 14) {
    return {
      grain: "day",
      points: points.map((point) => ({ label: point.day, views: point.views })),
    };
  }
  const weeks = new Map<string, number>();
  for (const point of points) {
    const label = weekStart(point.day);
    weeks.set(label, (weeks.get(label) ?? 0) + point.views);
  }
  return {
    grain: "week",
    points: [...weeks.entries()].map(([label, views]) => ({ label, views })),
  };
}

function weekStart(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return day;
  const weekday = date.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  return date.toISOString().slice(0, 10);
}

export function formatConversion(rate: number | null): string {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}
