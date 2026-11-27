import { InMemoryUserRepository } from '@api/infrastructure/repositories/InMemoryUserRepository';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('InMemoryUserRepository aliases and handle changes', () => {
  it('round-trips recordAlias and findAliasOwner', async () => {
    const repo = new InMemoryUserRepository();
    expect(await repo.findAliasOwner('old')).toBeNull();

    await repo.recordAlias('old', 'user-1');

    expect(await repo.findAliasOwner('old')).toBe('user-1');
  });

  it('keeps the first owner when an alias is recorded twice (on conflict do nothing)', async () => {
    const repo = new InMemoryUserRepository();
    await repo.recordAlias('old', 'user-1');
    await repo.recordAlias('old', 'user-2');

    expect(await repo.findAliasOwner('old')).toBe('user-1');
  });

  it('countHandleChangesSince respects the since date and the user', async () => {
    const repo = new InMemoryUserRepository();
    const now = Date.now();
    await repo.recordHandleChange('user-1', new Date(now - 40 * DAY_MS));
    await repo.recordHandleChange('user-1', new Date(now - 10 * DAY_MS));
    await repo.recordHandleChange('user-1', new Date(now - 1 * DAY_MS));
    await repo.recordHandleChange('user-2', new Date(now - 1 * DAY_MS));

    expect(await repo.countHandleChangesSince('user-1', new Date(now - 30 * DAY_MS))).toBe(2);
    expect(await repo.countHandleChangesSince('user-1', new Date(now - 50 * DAY_MS))).toBe(3);
    expect(await repo.countHandleChangesSince('user-1', new Date(now))).toBe(0);
  });

  it('oldestHandleChangeSince returns the earliest change in the window, or null', async () => {
    const repo = new InMemoryUserRepository();
    const now = Date.now();
    const inWindow = new Date(now - 10 * DAY_MS);
    await repo.recordHandleChange('user-1', new Date(now - 40 * DAY_MS));
    await repo.recordHandleChange('user-1', new Date(now - 1 * DAY_MS));
    await repo.recordHandleChange('user-1', inWindow);

    expect(await repo.oldestHandleChangeSince('user-1', new Date(now - 30 * DAY_MS))).toEqual(inWindow);
    expect(await repo.oldestHandleChangeSince('user-2', new Date(now - 30 * DAY_MS))).toBeNull();
  });
});
