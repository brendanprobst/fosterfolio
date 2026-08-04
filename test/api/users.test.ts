import request from 'supertest';
import type { GeoLookupAdapter } from '@api/infrastructure/adapters/geo/GeoLookupAdapter';
import { createTestAppWithContainer } from './setup';
import { createAuthToken } from './support/authToken';

describe('Users API', () => {
  const ownerId = '11111111-1111-1111-1111-111111111111';
  const otherId = '22222222-2222-2222-2222-222222222222';

  it('GET /users/:id returns public fields and omits private ones', async () => {
    const { app, container } = createTestAppWithContainer();
    const user = container.seedUser({
      id: ownerId,
      email: 'owner@example.com',
      displayName: 'Owner',
      starCount: 3,
    });
    user.applyProfileUpdate({
      zipCode: '94107',
      city: 'San Francisco',
      state: 'CA',
      lat: 37.76,
      lng: -122.39,
      bio: 'Hello',
    });
    await container.userRepository.save(user);

    const res = await request(app).get(`/users/${ownerId}`).expect(200);

    expect(res.body).toMatchObject({
      id: ownerId,
      displayName: 'Owner',
      bio: 'Hello',
      city: 'San Francisco',
      state: 'CA',
      starCount: 3,
    });
    expect(res.body).not.toHaveProperty('email');
    expect(res.body).not.toHaveProperty('zipCode');
    expect(res.body).not.toHaveProperty('lat');
    expect(res.body).not.toHaveProperty('lng');
  });

  it('PUT /users/:id forbids cross-owner updates', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    container.seedUser({ id: otherId, email: 'other@example.com' });

    const token = await createAuthToken(otherId, 'other@example.com');
    const res = await request(app)
      .put(`/users/${ownerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'Hacker' })
      .expect(403);

    expect(res.body.error.code).toBe('USER_FORBIDDEN');
  });

  it('PUT /users/:id updates own profile and returns owner fields', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });

    const token = await createAuthToken(ownerId, 'owner@example.com');
    const res = await request(app)
      .put(`/users/${ownerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: ' Foster Mom ', bio: 'Dogs forever' })
      .expect(200);

    expect(res.body).toMatchObject({
      id: ownerId,
      displayName: 'Foster Mom',
      bio: 'Dogs forever',
      email: 'owner@example.com',
    });
    expect(res.body).toHaveProperty('zipCode');
  });

  it('zip lookup fails soft when geo adapter returns null', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    const noop: GeoLookupAdapter = {
      lookupUsZip: async () => null,
    };
    container.setGeoLookup(noop);

    const token = await createAuthToken(ownerId, 'owner@example.com');
    const res = await request(app)
      .put(`/users/${ownerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ zipCode: '00000' })
      .expect(200);

    expect(res.body.zipCode).toBe('00000');
    expect(res.body.city).toBeNull();
    expect(res.body.state).toBeNull();
    expect(res.body.lat).toBeNull();
    expect(res.body.lng).toBeNull();
  });

  it('zip lookup applies city/state when adapter succeeds', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    container.setGeoLookup({
      lookupUsZip: async () => ({
        city: 'San Francisco',
        state: 'CA',
        lat: 37.76,
        lng: -122.39,
      }),
    });

    const token = await createAuthToken(ownerId, 'owner@example.com');
    const res = await request(app)
      .put(`/users/${ownerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ zipCode: '94107' })
      .expect(200);

    expect(res.body).toMatchObject({
      zipCode: '94107',
      city: 'San Francisco',
      state: 'CA',
      lat: 37.76,
      lng: -122.39,
    });
  });
});
