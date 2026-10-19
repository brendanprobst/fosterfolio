/** One rollup row. The package does not know which product the ids belong to. */
export type AggregateRow = {
  pet_id: string;
  link_id: string | null;
  channel_key: string;
  city: string | null;
  day: string;
  views: number;
  approx_visitors: number;
  form_opens: number;
};

/** App-supplied query. PostHogProvider sends `hogql` to the query API. */
export type AggregateQuery = {
  hogql: string;
};

export interface AnalyticsProvider {
  queryAggregates(query: AggregateQuery): Promise<AggregateRow[]>;
}

/** Stands in for a null link_id, so aggregateKey matches analytics_daily_uniq. */
export const NULL_LINK_ID = "00000000-0000-0000-0000-000000000000";

export function aggregateKey(
  row: Pick<AggregateRow, "pet_id" | "link_id" | "channel_key" | "city" | "day">,
): string {
  return [
    row.pet_id,
    row.link_id ?? NULL_LINK_ID,
    row.channel_key,
    row.city ?? "",
    row.day,
  ].join("\u0000");
}

function count(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}

function normalizeDay(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Copies only the stored metrics. inquiry_submitted is not one of them.
 * Event properties are client-writable, so a malformed row returns null to be
 * skipped. One bad event must not abort the whole rollup.
 */
export function normalizeAggregateRow(row: AggregateRow): AggregateRow | null {
  const petId = text(row.pet_id);
  const channelKey = text(row.channel_key);
  const day = normalizeDay(text(row.day));
  const views = count(row.views);
  const approxVisitors = count(row.approx_visitors);
  const formOpens = count(row.form_opens);
  if (!petId || !channelKey || !day) return null;
  if (views === null || approxVisitors === null || formOpens === null) return null;
  const linkId = text(row.link_id);
  const city = text(row.city);
  return {
    pet_id: petId,
    link_id: linkId ? linkId : null,
    channel_key: channelKey,
    city: city ? city : null,
    day,
    views,
    approx_visitors: approxVisitors,
    form_opens: formOpens,
  };
}
