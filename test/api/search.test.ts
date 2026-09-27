import request from 'supertest';
import { createTestAppWithContainer } from './setup';
import { createAuthToken } from './support/authToken';

describe('Search API', () => {
  const ownerId = '11111111-1111-1111-1111-111111111111';

  it('finds pets and users by name substring', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({
      id: ownerId,
      email: 'owner@example.com',
      displayName: 'Alex Foster',
      handle: 'alex',
    });
    const token = await createAuthToken(ownerId, 'owner@example.com');
    await request(app)
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mochi Bean', species: 'dog' })
      .expect(201);

    const res = await request(app).get('/search?q=mochi').expect(200);
    const petHit = res.body.pets.find((p: { name: string }) => p.name === 'Mochi Bean');
    expect(petHit).toMatchObject({
      name: 'Mochi Bean',
      ownerId,
      ownerHandle: 'alex',
    });

    const users = await request(app).get('/search?q=Alex').expect(200);
    expect(
      users.body.users.some(
        (u: { displayName: string; handle: string | null }) =>
          u.displayName === 'Alex Foster' && u.handle === 'alex'
      )
    ).toBe(true);
  });

  it('requires q', async () => {
    const { app } = createTestAppWithContainer();
    const res = await request(app).get('/search').expect(400);
    expect(res.body.error.code).toBe('SEARCH_QUERY_REQUIRED');
  });
});
