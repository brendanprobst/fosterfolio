import { UserRepository } from '@api/infrastructure/repositories/UserRepository';

const USER_ID = '11111111-1111-1111-1111-111111111111';

function build(overrides: Record<string, jest.Mock> = {}) {
  const adapter = {
    get: jest.fn().mockResolvedValue([]),
    post: jest.fn().mockResolvedValue(undefined),
    getWithCount: jest.fn().mockResolvedValue({ data: [], count: 0 }),
    ...overrides,
  };
  return { adapter, repo: new UserRepository(adapter as any) };
}

describe('UserRepository aliases and handle changes', () => {
  it('findAliasOwner returns the user id for an alias, or null', async () => {
    const hit = build({ get: jest.fn().mockResolvedValue([{ user_id: USER_ID }]) });
    await expect(hit.repo.findAliasOwner('elisa-probst')).resolves.toBe(USER_ID);
    expect(hit.adapter.get.mock.calls[0][0]).toBe(
      'user_handle_aliases?select=user_id&handle=eq.elisa-probst&limit=1'
    );

    const miss = build();
    await expect(miss.repo.findAliasOwner('nope')).resolves.toBeNull();
  });

  it('recordAlias inserts with on_conflict do nothing', async () => {
    const { adapter, repo } = build();

    await repo.recordAlias('elisa-probst', USER_ID);

    expect(adapter.post).toHaveBeenCalledWith(
      'user_handle_aliases?on_conflict=handle',
      [{ handle: 'elisa-probst', user_id: USER_ID }],
      { headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' } }
    );
  });

  it('countHandleChangesSince counts rows since the date for the user', async () => {
    const since = new Date('2026-11-01T00:00:00.000Z');
    const { adapter, repo } = build({
      getWithCount: jest.fn().mockResolvedValue({ data: [], count: 2 }),
    });

    await expect(repo.countHandleChangesSince(USER_ID, since)).resolves.toBe(2);

    const path = adapter.getWithCount.mock.calls[0][0] as string;
    expect(path).toContain('user_handle_changes?');
    expect(path).toContain(`user_id=eq.${USER_ID}`);
    expect(path).toContain(`changed_at=gte.${encodeURIComponent(since.toISOString())}`);
  });

  it('countHandleChangesSince treats a missing count as zero', async () => {
    const { repo } = build({ getWithCount: jest.fn().mockResolvedValue({ data: [], count: null }) });
    await expect(repo.countHandleChangesSince(USER_ID, new Date())).resolves.toBe(0);
  });

  it('recordHandleChange inserts a row', async () => {
    const at = new Date('2026-11-20T10:00:00.000Z');
    const { adapter, repo } = build();

    await repo.recordHandleChange(USER_ID, at);

    expect(adapter.post).toHaveBeenCalledWith(
      'user_handle_changes',
      [{ user_id: USER_ID, changed_at: at.toISOString() }],
      { headers: { Prefer: 'return=minimal' } }
    );
  });

  it('oldestHandleChangeSince returns the earliest change in the window, or null', async () => {
    const hit = build({
      get: jest.fn().mockResolvedValue([{ changed_at: '2026-11-10T00:00:00+00:00' }]),
    });
    const date = await hit.repo.oldestHandleChangeSince(USER_ID, new Date('2026-11-01T00:00:00.000Z'));
    expect(date?.toISOString()).toBe('2026-11-10T00:00:00.000Z');
    expect(hit.adapter.get.mock.calls[0][0]).toContain('order=changed_at.asc&limit=1');

    const miss = build();
    await expect(miss.repo.oldestHandleChangeSince(USER_ID, new Date())).resolves.toBeNull();
  });
});
