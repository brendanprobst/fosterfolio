import request from 'supertest';
import { createTestAppWithContainer } from './setup';
import { createAuthToken } from './support/authToken';

describe('Posts API', () => {
  const ownerId = '11111111-1111-1111-1111-111111111111';
  const otherId = '22222222-2222-2222-2222-222222222222';

  async function createPet(
    app: ReturnType<typeof createTestAppWithContainer>['app']
  ) {
    const token = await createAuthToken(ownerId, 'owner@example.com');
    const res = await request(app)
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mochi', species: 'dog', primaryPhotoUrl: 'https://cdn/mochi.jpg' })
      .expect(201);
    return res.body.id as string;
  }

  it('creates general and pet_update posts; feed includes pet denorm fields', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    const petId = await createPet(app);
    const token = await createAuthToken(ownerId, 'owner@example.com');

    await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ postType: 'general', bodyText: 'Hello foster world' })
      .expect(201);

    const petUpdate = await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        postType: 'pet_update',
        petId,
        bodyText: 'Ate breakfast',
      })
      .expect(201);

    expect(petUpdate.body).toMatchObject({
      postType: 'pet_update',
      petId,
      petName: 'Mochi',
      petPrimaryPhotoUrl: 'https://cdn/mochi.jpg',
    });

    const feed = await request(app).get('/posts?limit=10').expect(200);
    expect(feed.body.items.length).toBeGreaterThanOrEqual(2);
    const updateCard = feed.body.items.find(
      (p: { id: string }) => p.id === petUpdate.body.id
    );
    expect(updateCard).toMatchObject({
      petName: 'Mochi',
      petPrimaryPhotoUrl: 'https://cdn/mochi.jpg',
    });
  });

  it('keyset feed returns nextCursor and pages without duplicates', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    const token = await createAuthToken(ownerId, 'owner@example.com');

    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ bodyText: `Post ${i}` })
        .expect(201);
    }

    const page1 = await request(app).get('/posts?limit=2').expect(200);
    expect(page1.body.items).toHaveLength(2);
    expect(page1.body.nextCursor).toEqual(expect.any(String));

    const page2 = await request(app)
      .get(`/posts?limit=2&cursor=${encodeURIComponent(page1.body.nextCursor)}`)
      .expect(200);
    expect(page2.body.items).toHaveLength(2);

    const ids1 = page1.body.items.map((p: { id: string }) => p.id);
    const ids2 = page2.body.items.map((p: { id: string }) => p.id);
    expect(ids1.some((id: string) => ids2.includes(id))).toBe(false);
  });

  it('forbids cross-author update/delete', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    container.seedUser({ id: otherId, email: 'other@example.com' });
    const token = await createAuthToken(ownerId, 'owner@example.com');
    const created = await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ bodyText: 'Mine' })
      .expect(201);

    const otherToken = await createAuthToken(otherId, 'other@example.com');
    await request(app)
      .put(`/posts/${created.body.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ bodyText: 'Stolen' })
      .expect(403);

    await request(app)
      .delete(`/posts/${created.body.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  it('GET /users/:id/posts excludes pet_update', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    const petId = await createPet(app);
    const token = await createAuthToken(ownerId, 'owner@example.com');

    await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ bodyText: 'General only' })
      .expect(201);
    await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ postType: 'pet_update', petId, bodyText: 'Update' })
      .expect(201);

    const res = await request(app).get(`/users/${ownerId}/posts`).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].postType).toBe('general');
  });

  it('rejects pet_update without owned pet', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    const token = await createAuthToken(ownerId, 'owner@example.com');

    const res = await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        postType: 'pet_update',
        petId: '33333333-3333-3333-3333-333333333333',
        bodyText: 'Nope',
      })
      .expect(400);
    expect(res.body.error.code).toBe('POST_PET_REQUIRED');
  });
});
