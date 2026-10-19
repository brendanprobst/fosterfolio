import { aggregateKey } from '@lattice/analytics/server';
import { analyticsDailyKey } from '@api/infrastructure/analytics/analyticsDailyKey';

describe('analytics daily key', () => {
  it('matches the package rollup key, including null link and city', () => {
    const row = {
      petId: 'pet-1',
      linkId: null,
      channelKey: 'direct',
      city: null,
      day: '2026-10-08',
    };
    expect(analyticsDailyKey(row)).toBe(
      aggregateKey({
        pet_id: row.petId,
        link_id: row.linkId,
        channel_key: row.channelKey,
        city: row.city,
        day: row.day,
      })
    );
  });
});
