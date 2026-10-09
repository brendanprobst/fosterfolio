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
`.trim();
