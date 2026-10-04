import request from 'supertest';
import { createTestAppWithContainer } from './setup';

describe('Stars API', () => {
  const userId = '11111111-1111-1111-1111-111111111111';

  it('stars a profile and dedupes by session_token', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: userId, email: 'owner@example.com', starCount: 0 });

    const first = await request(app)
      .post(`/users/${userId}/star`)
      .send({ session_token: 'browser-a' })
      .expect(201);
    expect(first.body).toMatchObject({
      starred: true,
      created: true,
      starCount: 1,
    });

    const second = await request(app)
      .post(`/users/${userId}/star`)
      .send({ session_token: 'browser-a' })
      .expect(200);
    expect(second.body).toMatchObject({
      starred: true,
      created: false,
      starCount: 1,
    });

    const third = await request(app)
      .post(`/users/${userId}/star`)
      .send({ session_token: 'browser-b' })
      .expect(201);
    expect(third.body.starCount).toBe(2);

    const count = await request(app)
      .get(`/users/${userId}/star-count`)
      .expect(200);
    expect(count.body).toEqual({ starCount: 2 });
  });

  it('requires session_token', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: userId, email: 'owner@example.com' });

    const res = await request(app)
      .post(`/users/${userId}/star`)
      .send({})
      .expect(400);
    expect(res.body.error.code).toBe('STAR_INVALID_INPUT');
  });
});
