import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import { AnalyticsDailyRepository } from '@api/infrastructure/repositories/AnalyticsDailyRepository';

type Stored = {
  pet_id: string;
  link_id: string | null;
  channel_key: string;
  city: string | null;
  day: string;
  views: number;
  approx_visitors: number;
  form_opens: number;
  updated_at?: string;
};

class MemoryAdapter implements DataAdapter {
  rows: Stored[] = [];
  paths: string[] = [];

  async get<T>(path: string): Promise<T> {
    this.paths.push(path);
    if (path.includes('day=gte.')) {
      const start = /day=gte\.(\d{4}-\d{2}-\d{2})/.exec(path)?.[1];
      const end = /day=lte\.(\d{4}-\d{2}-\d{2})/.exec(path)?.[1];
      return this.rows.filter((row) => {
        if (start && row.day < start) return false;
        if (end && row.day > end) return false;
        return true;
      }) as T;
    }
    return this.rows as T;
  }

  async post<T>(): Promise<T> {
    throw new Error('unused');
  }

  async update<T>(path: string, body?: unknown): Promise<T> {
    this.paths.push(path);
    const day = /day=eq\.(\d{4}-\d{2}-\d{2})/.exec(path)?.[1];
    const row = this.rows.find((item) => item.day === day);
    if (row && body && typeof body === 'object') {
      Object.assign(row, body);
    }
    return [] as T;
  }

  async delete<T>(): Promise<T> {
    throw new Error('unused');
  }

  async getWithCount<T>(): Promise<{ data: T; count: number | null }> {
    throw new Error('unused');
  }

  async rpc<T>(): Promise<T> {
    throw new Error('unused');
  }

  async insertReturning<T>(_path: string, body?: unknown): Promise<T> {
    const rows = body as Stored[];
    this.rows.push(...rows);
    return [] as T;
  }
}

describe('AnalyticsDailyRepository upsert', () => {
  it('replaces the same key and leaves a day outside the window', async () => {
    const adapter = new MemoryAdapter();
    adapter.rows.push({
      pet_id: 'pet-1',
      link_id: null,
      channel_key: 'direct',
      city: null,
      day: '2026-01-01',
      views: 8,
      approx_visitors: 8,
      form_opens: 0,
    });
    const repo = new AnalyticsDailyRepository(adapter);

    const write = {
      petId: 'pet-1',
      linkId: 'link-1',
      channelKey: 'instagram',
      city: 'Austin',
      day: '2026-10-08',
      views: 2,
      approxVisitors: 2,
      formOpens: 1,
    };
    await repo.upsert([write]);
    await repo.upsert([{ ...write, views: 9, approxVisitors: 4, formOpens: 3 }]);

    expect(adapter.rows).toHaveLength(2);
    expect(adapter.rows.find((row) => row.day === '2026-01-01')?.views).toBe(8);
    expect(adapter.rows.find((row) => row.day === '2026-10-08')).toMatchObject({
      views: 9,
      approx_visitors: 4,
      form_opens: 3,
    });
  });

  it('encodes every filter value it sends to PostgREST', async () => {
    const adapter = new MemoryAdapter();
    const repo = new AnalyticsDailyRepository(adapter);
    const write = {
      petId: '6a1f0d7e-1c1b-4c8e-9d0f-2a3b4c5d6e7f',
      linkId: '7b2e1e8f-2d2c-4d9f-8e1a-3b4c5d6e7f80',
      channelKey: 'vet-office',
      city: 'St. Paul & Co',
      day: '2026-10-08',
      views: 1,
      approxVisitors: 1,
      formOpens: 0,
    };
    await repo.upsert([write]);
    await repo.upsert([{ ...write, views: 2 }]);

    const patch = adapter.paths[adapter.paths.length - 1] ?? '';
    expect(patch).toContain(`city=eq.${encodeURIComponent('"St. Paul & Co"')}`);
    expect(patch).not.toContain('& Co');
    expect(patch).toContain(`pet_id=eq.${write.petId}`);
    expect(patch).toContain(`link_id=eq.${write.linkId}`);
    expect(adapter.rows[0]?.views).toBe(2);
  });
});
