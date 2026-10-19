import { handler } from '@api/analyticsRollup';
import { ROLLUP_ROW_LIMIT } from '@api/application/analytics/fosterfolioDailyQuery';
import { Logger } from '@api/utils/logger';

const SUPABASE_URL = 'https://supabase.test';
const POSTHOG_HOST = 'https://posthog.test';

const OWNER = '5c0e9d6f-0b0a-4b7d-8c9e-1f2a3b4c5d6e';
const OTHER_OWNER = '9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a';
const PET = '6a1f0d7e-1c1b-4c8e-9d0f-2a3b4c5d6e7f';
const OTHER_PET = '0b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e';
const LINK = '7b2e1e8f-2d2c-4d9f-8e1a-3b4c5d6e7f80';
const OTHER_LINK = '3e4f5a6b-7c8d-4e9f-8a0b-1c2d3e4f5a6b';

const PET_COLUMNS = [
  'pet_id',
  'link_id',
  'channel_key',
  'city',
  'day',
  'views',
  'approx_visitors',
  'form_opens',
];
const OWNER_COLUMNS = [
  'owner_id',
  'link_id',
  'channel_key',
  'city',
  'day',
  'views',
  'approx_visitors',
  'pet_taps',
];

type Upsert = { path: string; prefer: string | undefined; body: Array<Record<string, unknown>> };

/**
 * Stands in for PostHog and Supabase behind global fetch, so the handler runs with its real
 * provider, verifier and repositories. Pets, users and links answer the verifier's lookups.
 */
class FakeBackend {
  petResults: unknown[][] = [];
  ownerResults: unknown[][] = [];
  pets = new Map<string, string>([
    [PET, OWNER],
    [OTHER_PET, OTHER_OWNER],
  ]);
  stoppedAt = new Map<string, string>();
  activeUsers = new Set([OWNER, OTHER_OWNER]);
  links = [
    { id: LINK, owner_id: OWNER, channel_key: 'instagram' },
    { id: OTHER_LINK, owner_id: OTHER_OWNER, channel_key: 'flyer' },
  ];
  hogql: string[] = [];
  upserts: Upsert[] = [];
  failUpsertOn: string | null = null;

  fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url.startsWith(`${POSTHOG_HOST}/api/projects/`)) {
      const sql = JSON.parse(String(init?.body)).query.query as string;
      this.hogql.push(sql);
      const owner = sql.includes('foster_me_viewed');
      return json({
        columns: owner ? OWNER_COLUMNS : PET_COLUMNS,
        results: owner ? this.ownerResults : this.petResults,
      });
    }
    const path = decodeURIComponent(url.slice(`${SUPABASE_URL}/rest/v1/`.length));
    if (method === 'POST') {
      const table = path.split('?')[0] ?? '';
      if (table === this.failUpsertOn) {
        return new Response('{"message":"boom"}', { status: 500 });
      }
      const headers = (init?.headers ?? {}) as Record<string, string>;
      this.upserts.push({ path, prefer: headers.Prefer, body: JSON.parse(String(init?.body)) });
      return new Response(null, { status: 201 });
    }
    const ids = inListIds(path);
    if (path.startsWith('pets?')) {
      return json(
        ids
          .filter((id) => this.pets.has(id))
          .map((id) => ({
            id,
            owner_id: this.pets.get(id),
            analytics_stopped_at: this.stoppedAt.get(id) ?? null,
          }))
      );
    }
    if (path.startsWith('users?')) {
      return json(ids.filter((id) => this.activeUsers.has(id)).map((id) => ({ id })));
    }
    if (path.startsWith('tracked_links?')) {
      return json(
        this.links
          .filter((link) => ids.includes(link.owner_id))
          .map((link) => ({
            ...link,
            target: 'pet',
            pet_id: null,
            code: 'abc12345',
            channel_name: link.channel_key,
            label: null,
            archived_at: null,
            created_at: '2026-10-01T00:00:00Z',
          }))
      );
    }
    throw new Error(`Unexpected request: ${method} ${path}`);
  };

  upsertFor(table: string): Upsert | undefined {
    return this.upserts.find((upsert) => upsert.path.startsWith(`${table}?`));
  }
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function inListIds(path: string): string[] {
  const list = /=in\.\(([^)]*)\)/.exec(path)?.[1] ?? '';
  return list ? list.split(',').map((id) => id.replace(/^"|"$/g, '')) : [];
}

function petRow(overrides: Partial<Record<string, unknown>> = {}): unknown[] {
  const row: Record<string, unknown> = {
    pet_id: PET,
    link_id: LINK,
    channel_key: 'instagram',
    city: 'Austin',
    day: '2026-10-08',
    views: 3,
    approx_visitors: 2,
    form_opens: 1,
    ...overrides,
  };
  return PET_COLUMNS.map((column) => row[column]);
}

function ownerRow(overrides: Partial<Record<string, unknown>> = {}): unknown[] {
  const row: Record<string, unknown> = {
    owner_id: OWNER,
    link_id: LINK,
    channel_key: 'instagram',
    city: 'Austin',
    day: '2026-10-08',
    views: 5,
    approx_visitors: 4,
    pet_taps: 2,
    ...overrides,
  };
  return OWNER_COLUMNS.map((column) => row[column]);
}

describe('analytics rollup handler', () => {
  const savedEnv = { ...process.env };
  const savedFetch = global.fetch;
  let backend: FakeBackend;
  let warnings: string[];

  beforeEach(() => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.POSTHOG_HOST = POSTHOG_HOST;
    process.env.POSTHOG_PROJECT_ID = '123';
    process.env.POSTHOG_PERSONAL_API_KEY = 'phx_test';
    backend = new FakeBackend();
    global.fetch = backend.fetch as typeof fetch;
    warnings = [];
    jest.spyOn(Logger, 'warning').mockImplementation((message) => {
      warnings.push(message);
    });
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    global.fetch = savedFetch;
    jest.restoreAllMocks();
  });

  it('writes verified pet and owner rows in one bulk upsert per table', async () => {
    backend.petResults = [petRow(), petRow({ link_id: null, channel_key: 'direct', city: null })];
    backend.ownerResults = [ownerRow()];

    const result = await handler();

    expect(result).toEqual({ rows: 3 });
    expect(backend.hogql).toHaveLength(2);
    for (const sql of backend.hogql) expect(sql).toMatch(/LIMIT 50000$/);
    expect(backend.upserts).toHaveLength(2);

    const pets = backend.upsertFor('analytics_daily');
    expect(pets?.path).toBe('analytics_daily?on_conflict=pet_id,link_id,channel_key,city,day');
    expect(pets?.prefer).toBe('resolution=merge-duplicates,return=minimal');
    expect(pets?.body).toEqual([
      expect.objectContaining({ pet_id: PET, link_id: LINK, city: 'Austin', views: 3 }),
      expect.objectContaining({ pet_id: PET, link_id: null, channel_key: 'direct', city: null }),
    ]);

    const owners = backend.upsertFor('analytics_owner_daily');
    expect(owners?.path).toBe(
      'analytics_owner_daily?on_conflict=owner_id,link_id,channel_key,city,day'
    );
    expect(owners?.body).toEqual([
      expect.objectContaining({ owner_id: OWNER, link_id: LINK, views: 5, pet_taps: 2 }),
    ]);
    expect(warnings).toEqual([]);
  });

  it('drops forged and malformed rows and logs only the counts', async () => {
    backend.petResults = [
      petRow(),
      petRow({ pet_id: 'not-a-uuid' }),
      petRow({ pet_id: 'e1d2c3b4-a5f6-4e7d-8c9b-0a1b2c3d4e5f' }),
      petRow({ link_id: OTHER_LINK }),
      petRow({ channel_key: 'made-up' }),
      petRow({ views: -1 }),
    ];
    backend.ownerResults = [ownerRow(), ownerRow({ owner_id: OTHER_OWNER })];
    backend.activeUsers.delete(OTHER_OWNER);

    const result = await handler();

    expect(result).toEqual({ rows: 2 });
    expect(backend.upsertFor('analytics_daily')?.body).toHaveLength(1);
    expect(backend.upsertFor('analytics_owner_daily')?.body).toEqual([
      expect.objectContaining({ owner_id: OWNER }),
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('skipped untrusted rows');
    expect(JSON.parse(warnings[0]?.replace(/^.*rows /, '') ?? '{}')).toEqual({
      malformed: 2,
      unknown_pet: 1,
      foreign_link: 1,
      unknown_channel: 1,
      unknown_owner: 1,
    });
    expect(warnings[0]).not.toContain('made-up');
    expect(warnings[0]).not.toContain('not-a-uuid');
  });

  it('keeps an adopted pet frozen: rows after analytics_stopped_at are not written', async () => {
    backend.stoppedAt.set(PET, '2026-10-08T15:30:00+00:00');
    backend.petResults = [
      petRow({ day: '2026-10-09' }),
      petRow({ day: '2026-10-08' }),
      petRow({ day: '2026-10-07' }),
    ];
    backend.ownerResults = [ownerRow({ day: '2026-10-09' })];

    const result = await handler();

    expect(result).toEqual({ rows: 3 });
    expect(backend.upsertFor('analytics_daily')?.body.map((row) => row.day)).toEqual([
      '2026-10-08',
      '2026-10-07',
    ]);
    // The foster-me page is the owner's, not the pet's, so owner rows are not frozen.
    expect(backend.upsertFor('analytics_owner_daily')?.body).toHaveLength(1);
    // Expected behavior, not forgery: no "untrusted rows" warning.
    expect(warnings).toEqual([]);
  });

  it('sums rows that normalize to the same key instead of failing the batch', async () => {
    backend.petResults = [petRow({ city: 'Austin' }), petRow({ city: ' Austin ', views: 4 })];
    backend.ownerResults = [
      ownerRow({ link_id: null, channel_key: '' }),
      ownerRow({ link_id: null, channel_key: 'direct', views: 1 }),
    ];

    await handler();

    expect(backend.upsertFor('analytics_daily')?.body).toEqual([
      expect.objectContaining({ city: 'Austin', views: 7, approx_visitors: 4, form_opens: 2 }),
    ]);
    expect(backend.upsertFor('analytics_owner_daily')?.body).toEqual([
      expect.objectContaining({ link_id: null, channel_key: 'direct', views: 6, pet_taps: 4 }),
    ]);
  });

  it('warns when a PostHog query returns the full row limit', async () => {
    backend.petResults = Array.from({ length: ROLLUP_ROW_LIMIT }, () => petRow({ pet_id: '' }));
    backend.ownerResults = [ownerRow()];

    await handler();

    expect(warnings.some((message) => message.includes(`${ROLLUP_ROW_LIMIT}-row limit`))).toBe(
      true
    );
    expect(warnings.find((message) => message.includes('row limit'))).toContain(
      `pet ${ROLLUP_ROW_LIMIT}, owner 1`
    );
  });

  it('fails the run when an upsert fails, so the Lambda reports an error', async () => {
    backend.petResults = [petRow()];
    backend.ownerResults = [ownerRow()];
    backend.failUpsertOn = 'analytics_owner_daily';

    await expect(handler()).rejects.toThrow('Supabase request failed (500)');
  });
});
