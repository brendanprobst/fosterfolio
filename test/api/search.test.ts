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
    });
    const token = await createAuthToken(ownerId, 'owner@example.com');
    await request(app)
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mochi Bean', species: 'dog' })
      .expect(201);

    const res = await request(app).get('/search?q=mochi').expect(200);
    expect(res.body.pets.some((p: { name: string }) => p.name === 'Mochi Bean')).toBe(
      true
    );

    const users = await request(app).get('/search?q=Alex').expect(200);
    expect(
      users.body.users.some((u: { displayName: string }) => u.displayName === 'Alex Foster')
    ).toBe(true);
  });

  it('requires q', async () => {
    const { app } = createTestAppWithContainer();
    const res = await request(app).get('/search').expect(400);
    expect(res.body.error.code).toBe('SEARCH_QUERY_REQUIRED');
  });
});
