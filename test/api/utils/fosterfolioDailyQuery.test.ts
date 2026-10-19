import {
  FOSTERFOLIO_DAILY_AGGREGATE_HOGQL,
  ROLLUP_ROW_LIMIT,
} from '@api/application/analytics/fosterfolioDailyQuery';
import { FOSTERFOLIO_OWNER_DAILY_HOGQL, mapOwnerDailyRow } from '@api/application/analytics/ownerDailyQuery';
import { InMemoryAnalyticsOwnerDailyRepository } from '@api/infrastructure/repositories/InMemoryAnalyticsOwnerDailyRepository';

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

  it('maps preview views and foster-me pet taps, including untagged direct traffic', async () => {
    const sql = FOSTERFOLIO_OWNER_DAILY_HOGQL;
    expect(sql).toContain("countIf(event = 'foster_me_viewed') AS views");
    expect(sql).toContain("uniqIf(person_id, event = 'foster_me_viewed') AS approx_visitors");
    expect(sql).toContain(
      "countIf(event = 'pet_viewed' AND properties.via_foster_me = true) AS pet_taps"
    );
    expect(sql).toContain("'direct'");

    const tagged = mapOwnerDailyRow({
      owner_id: 'owner-1',
      link_id: 'link-1',
      channel_key: 'lawn_sign',
      city: 'Austin',
      day: '2026-10-10',
      views: 4,
      approx_visitors: 3,
      pet_taps: 2,
    });
    const untagged = mapOwnerDailyRow({
      owner_id: 'owner-1',
      link_id: '',
      channel_key: '',
      city: '',
      day: '2026-10-10T00:00:00Z',
      views: 1,
      approx_visitors: 1,
      pet_taps: 1,
    });
    expect(tagged).toMatchObject({ views: 4, petTaps: 2, linkId: 'link-1', channelKey: 'lawn_sign' });
    expect(untagged).toMatchObject({
      views: 1,
      petTaps: 1,
      linkId: null,
      channelKey: 'direct',
      city: null,
    });

    const repo = new InMemoryAnalyticsOwnerDailyRepository();
    await repo.upsert([tagged!, untagged!]);
    expect(repo.records).toHaveLength(2);
    expect(repo.records.map((row) => row.petTaps)).toEqual([2, 1]);
    expect(repo.records.map((row) => row.views)).toEqual([4, 1]);
  });

  // PostHog's query API returns 100 rows when the HogQL has no LIMIT.
  it.each([
    ['pet', FOSTERFOLIO_DAILY_AGGREGATE_HOGQL],
    ['owner', FOSTERFOLIO_OWNER_DAILY_HOGQL],
  ])('sets an explicit row limit on the %s query, newest days first', (_name, sql) => {
    expect(ROLLUP_ROW_LIMIT).toBe(50000);
    expect(sql).toMatch(/\nORDER BY day DESC\nLIMIT 50000$/);
  });
});
