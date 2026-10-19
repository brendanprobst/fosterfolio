import type { ChannelOption } from "./types";

/** Keys the API reserves (referrer map + default link). No custom channel can take them. */
const SYSTEM_CHANNEL_NAMES = new Map([
  ["direct", "Direct / original QR"],
  ["search", "Search"],
  ["default", "Default link"],
]);

export function channelDisplayName(
  channelKey: string,
  channels: ChannelOption[],
  links: Array<{ channelKey: string; channelName: string }> = [],
): string {
  const systemName = SYSTEM_CHANNEL_NAMES.get(channelKey);
  if (systemName) return systemName;
  return (
    links.find((link) => link.channelKey === channelKey)?.channelName ??
    channels.find((channel) => channel.key === channelKey)?.name ??
    channelKey
  );
}

export type TrendBucket = { label: string; views: number; inquiries: number };

export function bucketTrend(
  views: Array<{ day: string; views: number }>,
  inquiries: Array<{ day: string; inquiries: number }>,
): { grain: "day" | "week"; points: TrendBucket[] } {
  const byDay = new Map<string, TrendBucket>();
  for (const point of views) {
    byDay.set(point.day, {
      label: point.day,
      views: point.views,
      inquiries: byDay.get(point.day)?.inquiries ?? 0,
    });
  }
  for (const point of inquiries) {
    byDay.set(point.day, {
      label: point.day,
      views: byDay.get(point.day)?.views ?? 0,
      inquiries: point.inquiries,
    });
  }
  if (byDay.size === 0) return { grain: "day", points: [] };

  const days = [...byDay.keys()].sort();
  const filled: TrendBucket[] = [];
  for (let day = days[0]!; day <= days[days.length - 1]!; day = addDays(day, 1)) {
    filled.push(byDay.get(day) ?? { label: day, views: 0, inquiries: 0 });
  }

  const daysWithViews = filled.filter((point) => point.views > 0).length;
  if (daysWithViews >= 14) return { grain: "day", points: filled };

  const weeks = new Map<string, TrendBucket>();
  for (const point of filled) {
    const label = weekStart(point.label);
    const week = weeks.get(label) ?? { label, views: 0, inquiries: 0 };
    week.views += point.views;
    week.inquiries += point.inquiries;
    weeks.set(label, week);
  }
  return { grain: "week", points: [...weeks.values()] };
}

function addDays(day: string, n: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
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

/** Zero-filled values for the last `days` UTC days ending today, oldest → newest. */
export function lastNDays<T extends { day: string }>(
  points: T[],
  pick: (point: T) => number,
  days: number,
  today = new Date(),
): number[] {
  const byDay = new Map(points.map((point) => [point.day, pick(point)]));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(end);
    day.setUTCDate(end.getUTCDate() - i);
    out.push(byDay.get(day.toISOString().slice(0, 10)) ?? 0);
  }
  return out;
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Feel-good framing: increases celebrated, decreases stated neutrally, never red. */
export function weekOverWeekCopy(current: number, previous: number): string | null {
  if (previous === 0) return current > 0 ? "New this week" : null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct >= 5) return `↑ ${pct}% vs last week`;
  if (pct <= -5) return "Quieter than last week";
  return "Steady with last week";
}
