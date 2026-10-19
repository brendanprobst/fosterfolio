import { AnalyticsDailyRepository } from '@api/infrastructure/repositories/AnalyticsDailyRepository';
import { RecordingDataAdapter } from '../support/fakes/RecordingDataAdapter';

function write(overrides: Record<string, unknown> = {}) {
  return {
    petId: '6a1f0d7e-1c1b-4c8e-9d0f-2a3b4c5d6e7f',
    linkId: '7b2e1e8f-2d2c-4d9f-8e1a-3b4c5d6e7f80',
    channelKey: 'instagram',
    city: 'Austin',
    day: '2026-10-08',
    views: 2,
    approxVisitors: 2,
    formOpens: 1,
    ...overrides,
  };
}

describe('AnalyticsDailyRepository upsert', () => {
  it('writes every row in one bulk upsert on the plain-column key', async () => {
    const adapter = new RecordingDataAdapter();
    const repo = new AnalyticsDailyRepository(adapter);
    const rows = Array.from({ length: 50 }, (_, i) =>
      write({ day: `2026-10-${String((i % 14) + 1).padStart(2, '0')}`, city: `City ${i}` })
    );

    await repo.upsert(rows);

    expect(adapter.calls).toHaveLength(1);
    const [call] = adapter.calls;
    expect(call?.method).toBe('post');
    expect(call?.path).toBe('analytics_daily?on_conflict=pet_id,link_id,channel_key,city,day');
    expect(call?.options?.headers?.Prefer).toBe('resolution=merge-duplicates,return=minimal');
    expect(call?.body).toHaveLength(50);
    expect((call?.body as unknown[])[0]).toEqual({
      pet_id: rows[0]?.petId,
      link_id: rows[0]?.linkId,
      channel_key: 'instagram',
      city: 'City 0',
      day: '2026-10-01',
      views: 2,
      approx_visitors: 2,
      form_opens: 1,
      updated_at: expect.any(String),
    });
  });

  it('sends null link and city as null, and reserved characters verbatim', async () => {
    const adapter = new RecordingDataAdapter();
    const repo = new AnalyticsDailyRepository(adapter);

    await repo.upsert([
      write({ linkId: null, channelKey: 'direct', city: null }),
      write({ city: 'St. Paul & Co' }),
    ]);

    const body = adapter.calls[0]?.body as Array<Record<string, unknown>>;
    expect(body[0]).toMatchObject({ link_id: null, city: null });
    expect(body[1]).toMatchObject({ city: 'St. Paul & Co' });
  });

  it('sums rows that share a key, since one statement cannot update a row twice', async () => {
    const adapter = new RecordingDataAdapter();
    const repo = new AnalyticsDailyRepository(adapter);

    await repo.upsert([
      write({ views: 2, approxVisitors: 1, formOpens: 0 }),
      write({ city: 'Boston' }),
      write({ views: 5, approxVisitors: 4, formOpens: 3 }),
    ]);

    const body = adapter.calls[0]?.body as Array<Record<string, unknown>>;
    expect(body).toHaveLength(2);
    expect(body[0]).toMatchObject({ city: 'Austin', views: 7, approx_visitors: 5, form_opens: 3 });
    expect(body[1]).toMatchObject({ city: 'Boston', views: 2 });
  });

  it('sends nothing for an empty batch', async () => {
    const adapter = new RecordingDataAdapter();
    await new AnalyticsDailyRepository(adapter).upsert([]);
    expect(adapter.calls).toHaveLength(0);
  });

  it('lets a failed bulk write throw instead of retrying row by row', async () => {
    const adapter = new RecordingDataAdapter();
    adapter.post = async () => {
      throw new Error('Supabase request failed (400): bad row');
    };
    const repo = new AnalyticsDailyRepository(adapter);

    await expect(repo.upsert([write(), write({ city: 'Boston' })])).rejects.toThrow('(400)');
  });
});

describe('AnalyticsDailyRepository sumViewsByLinkIds', () => {
  it('sums in SQL through one rpc, so totals are not cut off by the row cap', async () => {
    const adapter = new RecordingDataAdapter();
    adapter.rpcResult = [
      { link_id: 'link-1', views: 4200 },
      { link_id: 'link-2', views: '7' },
    ];
    const repo = new AnalyticsDailyRepository(adapter);

    const totals = await repo.sumViewsByLinkIds(['link-1', 'link-2', 'link-3']);

    expect(adapter.calls).toEqual([
      {
        method: 'rpc',
        path: 'analytics_link_view_totals',
        body: { p_link_ids: ['link-1', 'link-2', 'link-3'] },
      },
    ]);
    expect([...totals]).toEqual([
      ['link-1', 4200],
      ['link-2', 7],
    ]);
  });

  it('skips the request when there are no links', async () => {
    const adapter = new RecordingDataAdapter();
    const totals = await new AnalyticsDailyRepository(adapter).sumViewsByLinkIds([]);
    expect(totals.size).toBe(0);
    expect(adapter.calls).toHaveLength(0);
  });
});
