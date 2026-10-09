import { FOSTERFOLIO_DAILY_AGGREGATE_HOGQL } from '@api/application/analytics/fosterfolioDailyQuery';

describe('fosterfolio daily HogQL', () => {
  it('groups the last 14 days and does not count inquiry_submitted', () => {
    const sql = FOSTERFOLIO_DAILY_AGGREGATE_HOGQL;
    expect(sql).toContain("countIf(event = 'pet_viewed') AS views");
    expect(sql).toContain("uniqIf(person_id, event = 'pet_viewed') AS approx_visitors");
    expect(sql).toContain("countIf(event = 'inquiry_form_opened') AS form_opens");
    expect(sql).toContain("properties['$geoip_city_name']");
    expect(sql).toContain('today() - 13');
    expect(sql).toContain('GROUP BY pet_id, link_id, channel_key, city, day');
    expect(sql).not.toContain('inquiry_submitted');
    expect(sql).not.toContain('analytics_stopped_at');
    expect(sql).not.toContain('adopted');
  });
});
