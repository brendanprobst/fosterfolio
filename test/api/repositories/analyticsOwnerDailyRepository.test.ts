import { AnalyticsOwnerDailyRepository } from '@api/infrastructure/repositories/AnalyticsOwnerDailyRepository';
import { RecordingDataAdapter } from '../support/fakes/RecordingDataAdapter';

function write(overrides: Record<string, unknown> = {}) {
  return {
    ownerId: '5c0e9d6f-0b0a-4b7d-8c9e-1f2a3b4c5d6e',
    linkId: '7b2e1e8f-2d2c-4d9f-8e1a-3b4c5d6e7f80',
    channelKey: 'default',
    city: 'Austin',
    day: '2026-10-08',
    views: 3,
    approxVisitors: 2,
    petTaps: 1,
    ...overrides,
  };
}

describe('AnalyticsOwnerDailyRepository upsert', () => {
  it('writes every row in one bulk upsert on the plain-column key', async () => {
    const adapter = new RecordingDataAdapter();
    const repo = new AnalyticsOwnerDailyRepository(adapter);
    const rows = Array.from({ length: 30 }, (_, i) => write({ city: `City ${i}` }));

    await repo.upsert(rows);

    expect(adapter.calls).toHaveLength(1);
    const [call] = adapter.calls;
    expect(call?.method).toBe('post');
    expect(call?.path).toBe(
      'analytics_owner_daily?on_conflict=owner_id,link_id,channel_key,city,day'
    );
    expect(call?.options?.headers?.Prefer).toBe('resolution=merge-duplicates,return=minimal');
    expect(call?.body).toHaveLength(30);
    expect((call?.body as unknown[])[0]).toEqual({
      owner_id: rows[0]?.ownerId,
      link_id: rows[0]?.linkId,
      channel_key: 'default',
      city: 'City 0',
      day: '2026-10-08',
      views: 3,
      approx_visitors: 2,
      pet_taps: 1,
      updated_at: expect.any(String),
    });
  });

  it('sums rows that share a key, since one statement cannot update a row twice', async () => {
    const adapter = new RecordingDataAdapter();
    const repo = new AnalyticsOwnerDailyRepository(adapter);

    await repo.upsert([
      write({ linkId: null, channelKey: 'direct', city: null }),
      write({ linkId: null, channelKey: 'direct', city: null, views: 4, petTaps: 2 }),
    ]);

    const body = adapter.calls[0]?.body as Array<Record<string, unknown>>;
    expect(body).toEqual([
      expect.objectContaining({
        link_id: null,
        city: null,
        views: 7,
        approx_visitors: 4,
        pet_taps: 3,
      }),
    ]);
  });

  it('sends nothing for an empty batch', async () => {
    const adapter = new RecordingDataAdapter();
    await new AnalyticsOwnerDailyRepository(adapter).upsert([]);
    expect(adapter.calls).toHaveLength(0);
  });
});
