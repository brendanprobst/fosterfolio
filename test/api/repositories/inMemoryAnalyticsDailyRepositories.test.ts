import { InMemoryAnalyticsDailyRepository } from '@api/infrastructure/repositories/InMemoryAnalyticsDailyRepository';
import { InMemoryAnalyticsOwnerDailyRepository } from '@api/infrastructure/repositories/InMemoryAnalyticsOwnerDailyRepository';

const key = { linkId: null, channelKey: 'direct', city: 'Austin', day: '2026-10-08' };

describe('in-memory analytics repositories', () => {
  it('sum rows in one pet upsert that share a key, then overwrite on the next call', async () => {
    const repo = new InMemoryAnalyticsDailyRepository();
    const row = { ...key, petId: 'pet-1', views: 2, approxVisitors: 1, formOpens: 1 };

    await repo.upsert([row, { ...row, views: 3, approxVisitors: 2, formOpens: 0 }]);
    expect(repo.records).toEqual([{ ...row, views: 5, approxVisitors: 3, formOpens: 1 }]);

    await repo.upsert([{ ...row, views: 9 }]);
    expect(repo.records).toEqual([{ ...row, views: 9 }]);
  });

  it('sum rows in one owner upsert that share a key', async () => {
    const repo = new InMemoryAnalyticsOwnerDailyRepository();
    const row = { ...key, ownerId: 'owner-1', views: 4, approxVisitors: 3, petTaps: 1 };

    await repo.upsert([row, { ...row, views: 1, approxVisitors: 1, petTaps: 2 }]);
    expect(repo.records).toEqual([{ ...row, views: 5, approxVisitors: 4, petTaps: 3 }]);
  });
});
