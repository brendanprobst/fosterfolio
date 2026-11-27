import request from 'supertest';
import { createTestAppWithContainer } from './setup';
import { createAuthToken } from './support/authToken';

const DAY_MS = 24 * 60 * 60 * 1000;
const ownerId = '11111111-1111-1111-1111-111111111111';
const otherId = '22222222-2222-2222-2222-222222222222';

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

async function setHandle(
  app: ReturnType<typeof createTestAppWithContainer>['app'],
  userId: string,
  email: string,
  handle: string | null,
  status: number
) {
  const token = await createAuthToken(userId, email);
  return request(app)
    .put(`/users/${userId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ handle })
    .expect(status);
}

describe('Handle aliases', () => {
  it('records the old handle as an alias when a handle changes', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'elisa-probst' });

    await setHandle(app, ownerId, 'owner@example.com', 'elisa', 200);

    await expect(container.userRepository.findAliasOwner('elisa-probst')).resolves.toBe(ownerId);
    await expect(container.userRepository.findAliasOwner('elisa')).resolves.toBeNull();
  });

  it('records the old handle as an alias when the handle is cleared', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'elisa' });

    const res = await setHandle(app, ownerId, 'owner@example.com', null, 200);

    expect(res.body.handle).toBeNull();
    await expect(container.userRepository.findAliasOwner('elisa')).resolves.toBe(ownerId);
    await expect(
      container.userRepository.countHandleChangesSince(ownerId, daysAgo(1))
    ).resolves.toBe(1);
  });

  it('records no alias and no change when a first handle is set', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });

    await setHandle(app, ownerId, 'owner@example.com', 'elisa', 200);

    await expect(
      container.userRepository.countHandleChangesSince(ownerId, daysAgo(30))
    ).resolves.toBe(0);
    expect(await container.userRepository.findAliasOwner('elisa')).toBeNull();
  });

  it('does not record anything when the handle is re-sent unchanged', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'elisa' });

    await setHandle(app, ownerId, 'owner@example.com', ' Elisa ', 200);

    await expect(
      container.userRepository.countHandleChangesSince(ownerId, daysAgo(30))
    ).resolves.toBe(0);
    await expect(container.userRepository.findAliasOwner('elisa')).resolves.toBeNull();
  });

  it('blocks a handle that is an alias owned by another user', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'elisa' });
    container.seedUser({ id: otherId, email: 'other@example.com', handle: 'someone' });
    await container.userRepository.recordAlias('elisa-probst', ownerId);

    const res = await setHandle(app, otherId, 'other@example.com', 'elisa-probst', 409);

    expect(res.body.error.code).toBe('HANDLE_TAKEN');
    const firstClaim = container.seedUser({ id: '33333333-3333-3333-3333-333333333333', email: 'third@example.com' });
    const blockedFirst = await setHandle(app, firstClaim.id, 'third@example.com', 'elisa-probst', 409);
    expect(blockedFirst.body.error.code).toBe('HANDLE_TAKEN');
  });

  it('lets the owner take one of their own aliases back', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'elisa' });
    await container.userRepository.recordAlias('elisa-probst', ownerId);

    const res = await setHandle(app, ownerId, 'owner@example.com', 'elisa-probst', 200);

    expect(res.body.handle).toBe('elisa-probst');
    await expect(container.userRepository.findAliasOwner('elisa')).resolves.toBe(ownerId);
  });

  it('GET /users/:alias returns the current user with canonicalHandle', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'elisa-probst' });
    await setHandle(app, ownerId, 'owner@example.com', 'elisa', 200);

    const res = await request(app).get('/users/@elisa-probst').expect(200);

    expect(res.body).toMatchObject({ id: ownerId, handle: 'elisa', canonicalHandle: 'elisa' });
  });

  it('GET /users/:handle has no canonicalHandle when the handle is current', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'elisa' });

    const byHandle = await request(app).get('/users/elisa').expect(200);
    const byId = await request(app).get(`/users/${ownerId}`).expect(200);

    expect(byHandle.body).not.toHaveProperty('canonicalHandle');
    expect(byId.body).not.toHaveProperty('canonicalHandle');
  });

  it('GET /users/:alias for a cleared handle resolves the user without a canonicalHandle', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'elisa' });
    await setHandle(app, ownerId, 'owner@example.com', null, 200);

    const res = await request(app).get('/users/elisa').expect(200);

    expect(res.body).toMatchObject({ id: ownerId, handle: null });
    expect(res.body).not.toHaveProperty('canonicalHandle');
  });

  it('owner GET by alias also carries canonicalHandle', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'elisa' });
    await container.userRepository.recordAlias('elisa-probst', ownerId);

    const token = await createAuthToken(ownerId, 'owner@example.com');
    const res = await request(app)
      .get('/users/elisa-probst')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({ email: 'owner@example.com', canonicalHandle: 'elisa' });
  });

  it('other routes that resolve an owner by handle follow the alias', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'elisa' });
    await container.userRepository.recordAlias('elisa-probst', ownerId);

    await request(app).get('/users/elisa-probst/pets').expect(200);
  });

  it('an alias of a soft-deleted user does not resolve', async () => {
    const { app, container } = createTestAppWithContainer();
    const user = container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'elisa' });
    await container.userRepository.recordAlias('elisa-probst', ownerId);
    (user as unknown as { props: { deletedAt: Date } }).props.deletedAt = new Date();

    await request(app).get('/users/elisa-probst').expect(404);
  });
});

describe('Handle change cooldown', () => {
  it('allows a change with no changes in the window', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'one' });

    await setHandle(app, ownerId, 'owner@example.com', 'two', 200);
  });

  it('allows a second change inside the window, then rejects the third with nextChangeAt', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'one' });

    await setHandle(app, ownerId, 'owner@example.com', 'two', 200);
    await setHandle(app, ownerId, 'owner@example.com', 'three', 200);
    const res = await setHandle(app, ownerId, 'owner@example.com', 'four', 409);

    expect(res.body.error.code).toBe('HANDLE_CHANGE_LIMIT');
    expect(typeof res.body.error.metadata.nextChangeAt).toBe('string');
    const user = await request(app).get(`/users/${ownerId}`).expect(200);
    expect(user.body.handle).toBe('three');
  });

  it('rejects with nextChangeAt = oldest change in the window + 30 days', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'one' });
    const oldest = daysAgo(10);
    await container.userRepository.recordHandleChange(ownerId, oldest);
    await container.userRepository.recordHandleChange(ownerId, daysAgo(2));

    const res = await setHandle(app, ownerId, 'owner@example.com', 'two', 409);

    expect(res.body.error.code).toBe('HANDLE_CHANGE_LIMIT');
    expect(res.body.error.metadata.nextChangeAt).toBe(
      new Date(oldest.getTime() + 30 * DAY_MS).toISOString()
    );
  });

  it('allows a change when two changes exist but the oldest is outside the window', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'one' });
    await container.userRepository.recordHandleChange(ownerId, daysAgo(31));
    await container.userRepository.recordHandleChange(ownerId, daysAgo(2));

    await setHandle(app, ownerId, 'owner@example.com', 'two', 200);
  });

  it('a rejected change records no alias and no change', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'one' });
    await container.userRepository.recordHandleChange(ownerId, daysAgo(10));
    await container.userRepository.recordHandleChange(ownerId, daysAgo(2));

    await setHandle(app, ownerId, 'owner@example.com', 'two', 409);

    await expect(container.userRepository.findAliasOwner('one')).resolves.toBeNull();
    await expect(
      container.userRepository.countHandleChangesSince(ownerId, daysAgo(30))
    ).resolves.toBe(2);
  });

  it('a first handle is allowed even when the cooldown is exhausted', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    await container.userRepository.recordHandleChange(ownerId, daysAgo(10));
    await container.userRepository.recordHandleChange(ownerId, daysAgo(2));

    await setHandle(app, ownerId, 'owner@example.com', 'elisa', 200);
  });

  it('a handle taken by someone else is still HANDLE_TAKEN, not a cooldown error, and does not count', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'one' });
    container.seedUser({ id: otherId, email: 'other@example.com', handle: 'taken' });

    await setHandle(app, ownerId, 'owner@example.com', 'taken', 409);

    await expect(
      container.userRepository.countHandleChangesSince(ownerId, daysAgo(30))
    ).resolves.toBe(0);
  });

  it('a failed save (unique-index race) records no change', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'one' });
    container.userRepository.save = async () => {
      throw new Error(
        'Supabase request failed (409): {"code":"23505","message":"duplicate key value violates unique constraint \\"users_handle_unique\\""}'
      );
    };

    const res = await setHandle(app, ownerId, 'owner@example.com', 'race', 409);

    expect(res.body.error.code).toBe('HANDLE_TAKEN');
    await expect(
      container.userRepository.countHandleChangesSince(ownerId, daysAgo(30))
    ).resolves.toBe(0);
  });

  it('profile edits that do not touch the handle never hit the cooldown', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com', handle: 'one' });
    await container.userRepository.recordHandleChange(ownerId, daysAgo(10));
    await container.userRepository.recordHandleChange(ownerId, daysAgo(2));

    const token = await createAuthToken(ownerId, 'owner@example.com');
    await request(app)
      .put(`/users/${ownerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'Hello' })
      .expect(200);
  });
});
