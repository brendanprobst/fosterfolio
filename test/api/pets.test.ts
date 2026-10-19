import request from 'supertest';
import { createTestAppWithContainer } from './setup';
import { createAuthToken } from './support/authToken';

describe('Pets API', () => {
  const ownerId = '11111111-1111-1111-1111-111111111111';
  const otherId = '22222222-2222-2222-2222-222222222222';

  async function createOwnedPet(
    app: ReturnType<typeof createTestAppWithContainer>['app'],
    userId: string,
    body: Record<string, unknown> = {}
  ) {
    const token = await createAuthToken(userId, `${userId}@example.com`);
    const res = await request(app)
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Mochi',
        species: 'dog',
        bioMarkdown: 'A very good boy',
        primaryPhotoUrl: 'https://cdn.example.com/mochi.jpg',
        ...body,
      })
      .expect(201);
    return res.body as { id: string; meta: { title: string; description: string } };
  }

  it('creates a pet and returns meta on public GET', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({
      id: ownerId,
      email: 'owner@example.com',
      displayName: 'Alex Foster',
    });

    const created = await createOwnedPet(app, ownerId);
    expect(created.id).toEqual(expect.any(String));
    expect(created.meta.title).toContain('Mochi');

    const res = await request(app).get(`/pets/${created.id}`).expect(200);
    expect(res.body).toMatchObject({
      id: created.id,
      ownerId,
      name: 'Mochi',
      species: 'dog',
      updates: [],
      owner: {
        id: ownerId,
        handle: null,
        displayName: 'Alex Foster',
        avatarUrl: null,
      },
    });
    expect(res.body.meta).toMatchObject({
      title: 'Mochi · Fosterfolio',
      description: 'A very good boy',
      imageUrl: 'https://cdn.example.com/mochi.jpg',
    });
    expect(res.body.owner).not.toHaveProperty('email');
    expect(res.body.owner).not.toHaveProperty('zipCode');
  });

  it('forbids cross-owner update and delete', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    container.seedUser({ id: otherId, email: 'other@example.com' });

    const created = await createOwnedPet(app, ownerId);
    const otherToken = await createAuthToken(otherId, 'other@example.com');

    const updateRes = await request(app)
      .put(`/pets/${created.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'Stolen' })
      .expect(403);
    expect(updateRes.body.error.code).toBe('PET_FORBIDDEN');

    const deleteRes = await request(app)
      .delete(`/pets/${created.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
    expect(deleteRes.body.error.code).toBe('PET_FORBIDDEN');
  });

  it('soft-deletes owned pet so public GET returns 404', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });

    const created = await createOwnedPet(app, ownerId);
    const token = await createAuthToken(ownerId, 'owner@example.com');

    await request(app)
      .delete(`/pets/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app).get(`/pets/${created.id}`).expect(404);
  });

  it('lists pets for owner via GET /users/:id/pets', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });

    await createOwnedPet(app, ownerId, { name: 'Mochi' });
    await createOwnedPet(app, ownerId, { name: 'Beans', species: 'cat' });

    const res = await request(app).get(`/users/${ownerId}/pets`).expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((p: { name: string }) => p.name).sort()).toEqual([
      'Beans',
      'Mochi',
    ]);
  });

  it('stores an ordered photo list and uses the first url as the cover', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });

    const created = await createOwnedPet(app, ownerId, {
      primaryPhotoUrl: 'https://cdn.example.com/ignored.jpg',
      photos: [
        { url: ' https://cdn.example.com/cover.jpg ' },
        { url: 'https://cdn.example.com/second.jpg' },
      ],
    });

    const res = await request(app).get(`/pets/${created.id}`).expect(200);
    expect(res.body.photos).toEqual([
      { url: 'https://cdn.example.com/cover.jpg' },
      { url: 'https://cdn.example.com/second.jpg' },
    ]);
    expect(res.body.primaryPhotoUrl).toBe('https://cdn.example.com/cover.jpg');
    expect(res.body.meta.imageUrl).toBe('https://cdn.example.com/cover.jpg');

    const token = await createAuthToken(ownerId, 'owner@example.com');
    const tooMany = await request(app)
      .put(`/pets/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        photos: Array.from({ length: 11 }, (_, index) => ({
          url: `https://cdn.example.com/${index}.jpg`,
        })),
      })
      .expect(400);
    expect(tooMany.body.error.code).toBe('PET_PHOTOS_LIMIT');
  });

  it('does not treat a path word as a pet id', async () => {
    const { app } = createTestAppWithContainer();
    const links = await request(app).get('/pets/links').expect(404);
    const updates = await request(app).get('/pets/updates').expect(404);
    expect(links.body.error.code).toBeUndefined();
    expect(updates.body.error.code).toBeUndefined();
  });

  it('sets analytics_stopped_at when status becomes adopted and clears it otherwise', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    const created = await createOwnedPet(app, ownerId);
    const token = await createAuthToken(ownerId, 'owner@example.com');

    expect((await container.petRepository.findById(created.id))?.analyticsStoppedAt).toBeNull();

    await request(app)
      .put(`/pets/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'adopted' })
      .expect(200);

    const stopped = (await container.petRepository.findById(created.id))?.analyticsStoppedAt;
    expect(stopped).toBeInstanceOf(Date);

    await request(app)
      .put(`/pets/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mochi still' })
      .expect(200);
    expect(
      (await container.petRepository.findById(created.id))?.analyticsStoppedAt?.toISOString()
    ).toBe(stopped?.toISOString());

    await request(app)
      .put(`/pets/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'available' })
      .expect(200);
    expect((await container.petRepository.findById(created.id))?.analyticsStoppedAt).toBeNull();
  });

  it('rejects unauthenticated create', async () => {
    const { app } = createTestAppWithContainer();
    await request(app)
      .post('/pets')
      .send({ name: 'Mochi', species: 'dog' })
      .expect(401);
  });
});
