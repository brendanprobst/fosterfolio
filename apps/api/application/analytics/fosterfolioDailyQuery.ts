/**
 * PostHog's query API returns only 100 rows when the HogQL has no LIMIT, and 50,000 is its
 * maximum. Both rollup queries sort newest day first, so a run that hits the limit leaves some
 * rows from the oldest days as an earlier run wrote them. The handler logs a warning.
 */
export const ROLLUP_ROW_LIMIT = 50000;

/**
 * One HogQL query per rollup run. Last 14 calendar days inclusive (today and
 * the 13 days before it), grouped by pet, link, channel, city, and day.
 *
 * views and approx_visitors count pet_viewed only. form_opens counts
 * inquiry_form_opened. inquiry_submitted is not a column: inquiry totals are
 * read from Supabase later. City is PostHog's $geoip_city_name and may be null.
 * Adopted pets are not filtered; analytics_stopped_at is a capture cutoff only.
 */
export const FOSTERFOLIO_DAILY_AGGREGATE_HOGQL = `
SELECT
  toString(properties.pet_id) AS pet_id,
  nullIf(toString(properties.link_id), '') AS link_id,
  toString(properties.channel_key) AS channel_key,
  nullIf(toString(properties['$geoip_city_name']), '') AS city,
  toDate(timestamp) AS day,
  countIf(event = 'pet_viewed') AS views,
  uniqIf(person_id, event = 'pet_viewed') AS approx_visitors,
  countIf(event = 'inquiry_form_opened') AS form_opens
FROM events
WHERE event IN ('pet_viewed', 'inquiry_form_opened')
  AND toDate(timestamp) >= today() - 13
  AND toDate(timestamp) <= today()
GROUP BY pet_id, link_id, channel_key, city, day
ORDER BY day DESC
LIMIT ${ROLLUP_ROW_LIMIT}
`.trim();
