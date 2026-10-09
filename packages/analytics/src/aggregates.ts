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

/** Matches analytics_daily's coalesced unique key. */
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

function count(value: unknown, field: string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Aggregate row has an invalid ${field}`);
  }
  return Math.trunc(n);
}

function normalizeDay(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? null;
}

/** Copies only the stored metrics. inquiry_submitted is not one of them. */
export function normalizeAggregateRow(row: AggregateRow): AggregateRow {
  const petId = row.pet_id?.trim() ?? "";
  const channelKey = row.channel_key?.trim() ?? "";
  const day = normalizeDay(row.day ?? "");
  if (!petId || !channelKey || !day) {
    throw new Error("Aggregate row is missing pet_id, channel_key, or day");
  }
  const linkId = row.link_id?.trim() ?? "";
  const city = row.city?.trim() ?? "";
  return {
    pet_id: petId,
    link_id: linkId ? linkId : null,
    channel_key: channelKey,
    city: city ? city : null,
    day,
    views: count(row.views, "views"),
    approx_visitors: count(row.approx_visitors, "approx_visitors"),
    form_opens: count(row.form_opens, "form_opens"),
  };
}
