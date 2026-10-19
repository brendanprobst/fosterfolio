import { ROLLUP_ROW_LIMIT } from "@api/application/analytics/fosterfolioDailyQuery";

/**
 * Owner-level rollup. views and approx_visitors count foster_me_viewed.
 * pet_taps count pet_viewed only when via_foster_me is set. An empty channel
 * becomes direct, and a missing link id stays null, so untagged preview
 * traffic is stored instead of dropped.
 */
export const FOSTERFOLIO_OWNER_DAILY_HOGQL = `
SELECT
  toString(properties.owner_id) AS owner_id,
  nullIf(toString(properties.link_id), '') AS link_id,
  if(
    empty(toString(properties.channel_key)),
    'direct',
    toString(properties.channel_key)
  ) AS channel_key,
  nullIf(toString(properties['$geoip_city_name']), '') AS city,
  toDate(timestamp) AS day,
  countIf(event = 'foster_me_viewed') AS views,
  uniqIf(person_id, event = 'foster_me_viewed') AS approx_visitors,
  countIf(event = 'pet_viewed' AND properties.via_foster_me = true) AS pet_taps
FROM events
WHERE event IN ('foster_me_viewed', 'pet_viewed')
  AND (
    event = 'foster_me_viewed'
    OR (event = 'pet_viewed' AND properties.via_foster_me = true)
  )
  AND toDate(timestamp) >= today() - 13
  AND toDate(timestamp) <= today()
GROUP BY owner_id, link_id, channel_key, city, day
ORDER BY day DESC
LIMIT ${ROLLUP_ROW_LIMIT}
`.trim();

export type OwnerDailyWrite = {
  ownerId: string;
  linkId: string | null;
  channelKey: string;
  city: string | null;
  day: string;
  views: number;
  approxVisitors: number;
  petTaps: number;
};

function text(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function count(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.trunc(n);
}

/** Maps one HogQL row. Returns null when owner id or day is missing. */
export function mapOwnerDailyRow(row: Record<string, unknown>): OwnerDailyWrite | null {
  const ownerId = text(row.owner_id);
  const dayMatch = /^(\d{4}-\d{2}-\d{2})/.exec(text(row.day));
  const day = dayMatch?.[1] ?? "";
  if (!ownerId || !day) return null;
  const channelKey = text(row.channel_key) || "direct";
  const linkId = text(row.link_id);
  const city = text(row.city);
  return {
    ownerId,
    linkId: linkId || null,
    channelKey,
    city: city || null,
    day,
    views: count(row.views),
    approxVisitors: count(row.approx_visitors),
    petTaps: count(row.pet_taps),
  };
}
