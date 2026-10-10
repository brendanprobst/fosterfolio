import request from 'supertest';
import { createTestAppWithContainer } from './setup';
import { createAuthToken } from './support/authToken';

const PRESET_KEYS = [
  'lawn_sign',
  'instagram',
  'facebook',
  'tiktok',
  'flyer',
];

describe('Tracked links API', () => {
  const ownerId = '11111111-1111-1111-1111-111111111111';
  const otherId = '22222222-2222-2222-2222-222222222222';

  async function createOwnedPet(app: ReturnType<typeof createTestAppWithContainer>['app']) {
    const token = await createAuthToken(ownerId, 'owner@example.com');
    const res = await request(app)
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mochi', species: 'dog' })
      .expect(201);
    return res.body.id as string;
  }

  it('lets the owner create, list, and patch links, and rejects a non-owner', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    container.seedUser({ id: otherId, email: 'other@example.com' });
    const petId = await createOwnedPet(app);
    const ownerToken = await createAuthToken(ownerId, 'owner@example.com');
    const otherToken = await createAuthToken(otherId, 'other@example.com');

    const created = await request(app)
      .post(`/pets/${petId}/links`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ channelKey: 'lawn_sign', label: 'front yard' })
      .expect(201);

    expect(created.body).toMatchObject({
      petId,
      ownerId,
      channelKey: 'lawn_sign',
      channelName: 'Lawn sign',
      label: 'front yard',
      archivedAt: null,
      views: 0,
      inquiries: 0,
    });
    expect(created.body.code).toMatch(/^[A-Za-z0-9_-]{6,8}$/);

    const forbidden = await request(app)
      .post(`/pets/${petId}/links`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ channelName: 'Vet Office' })
      .expect(403);
    expect(forbidden.body.error.code).toBe('TRACKED_LINK_FORBIDDEN');

    const listed = await request(app)
      .get(`/pets/${petId}/links`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(listed.body).toHaveLength(1);
    expect(listed.body[0].views).toBe(0);
    expect(listed.body[0].inquiries).toBe(0);

    const otherList = await request(app)
      .get(`/pets/${petId}/links`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
    expect(otherList.body.error.code).toBe('TRACKED_LINK_FORBIDDEN');

    const patched = await request(app)
      .patch(`/links/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ label: 'corner of 5th', channelKey: 'flyer' })
      .expect(200);
    expect(patched.body).toMatchObject({
      label: 'corner of 5th',
      channelKey: 'flyer',
      channelName: 'Flyer',
    });

    const otherPatch = await request(app)
      .patch(`/links/${created.body.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ label: 'stolen' })
      .expect(403);
    expect(otherPatch.body.error.code).toBe('TRACKED_LINK_FORBIDDEN');
  });

  it('resolves active and archived codes and rejects an unknown code', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    const petId = await createOwnedPet(app);
    const token = await createAuthToken(ownerId, 'owner@example.com');

    const created = await request(app)
      .post(`/pets/${petId}/links`)
      .set('Authorization', `Bearer ${token}`)
      .send({ channelKey: 'instagram', label: 'bio link' })
      .expect(201);

    const active = await request(app)
      .get(`/links/resolve/${created.body.code}`)
      .expect(200);
    expect(active.body).toEqual({
      linkId: created.body.id,
      channelKey: 'instagram',
      petId,
    });

    await request(app)
      .patch(`/links/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ archived: true })
      .expect(200);

    const archived = await request(app)
      .get(`/links/resolve/${created.body.code}`)
      .expect(200);
    expect(archived.body).toEqual({
      linkId: created.body.id,
      channelKey: 'instagram',
      petId,
    });

    const listed = await request(app)
      .get(`/pets/${petId}/links`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listed.body[0].archivedAt).toEqual(expect.any(String));

    const unknown = await request(app).get('/links/resolve/not-a-real-code').expect(404);
    expect(unknown.body.error.code).toBe('TRACKED_LINK_NOT_FOUND');
  });

  it('groups custom channel names that slugify to the same key and lists presets first', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    const petId = await createOwnedPet(app);
    const token = await createAuthToken(ownerId, 'owner@example.com');

    const empty = await request(app)
      .get('/me/channels')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(empty.body.map((row: { key: string }) => row.key)).toEqual(PRESET_KEYS);
    expect(empty.body.every((row: { isPreset: boolean }) => row.isPreset)).toBe(true);
    expect(empty.body.length).toBeGreaterThan(0);

    const first = await request(app)
      .post(`/pets/${petId}/links`)
      .set('Authorization', `Bearer ${token}`)
      .send({ channelName: 'Vet Office', label: 'lobby' })
      .expect(201);
    const second = await request(app)
      .post(`/pets/${petId}/links`)
      .set('Authorization', `Bearer ${token}`)
      .send({ channelName: 'vet office' })
      .expect(201);

    expect(first.body.channelKey).toBe('vet-office');
    expect(first.body.channelName).toBe('Vet Office');
    expect(second.body.channelKey).toBe('vet-office');
    expect(second.body.channelName).toBe('vet office');

    await request(app)
      .patch(`/links/${second.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ archived: true })
      .expect(200);

    const channels = await request(app)
      .get('/me/channels')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(channels.body.slice(0, PRESET_KEYS.length).map((row: { key: string }) => row.key)).toEqual(
      PRESET_KEYS
    );
    expect(channels.body.slice(PRESET_KEYS.length)).toEqual([
      { key: 'vet-office', name: 'Vet Office', isPreset: false },
      { key: 'vet-office', name: 'vet office', isPreset: false },
    ]);

    await request(app)
      .patch(`/links/${second.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ archived: false })
      .expect(200);

    const restored = await request(app)
      .get(`/links/resolve/${second.body.code}`)
      .expect(200);
    expect(restored.body.channelKey).toBe('vet-office');
  });

  it('lists all-time view and inquiry totals and leaves direct inquiries off the link', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    const petId = await createOwnedPet(app);
    const token = await createAuthToken(ownerId, 'owner@example.com');

    const created = await request(app)
      .post(`/pets/${petId}/links`)
      .set('Authorization', `Bearer ${token}`)
      .send({ channelKey: 'instagram', label: 'bio' })
      .expect(201);
    expect(created.body.views).toBe(0);
    expect(created.body.inquiries).toBe(0);

    const quiet = await request(app)
      .post(`/pets/${petId}/links`)
      .set('Authorization', `Bearer ${token}`)
      .send({ channelKey: 'flyer' })
      .expect(201);

    container.analyticsDailyRepository.seed({
      petId,
      linkId: created.body.id,
      channelKey: 'instagram',
      city: 'Austin',
      day: '2026-01-01',
      views: 4,
      approxVisitors: 3,
      formOpens: 1,
    });
    container.analyticsDailyRepository.seed({
      petId,
      linkId: created.body.id,
      channelKey: 'instagram',
      city: null,
      day: '2026-02-01',
      views: 6,
      approxVisitors: 5,
      formOpens: 0,
    });
    container.inquiryRepository.seed({
      id: '11111111-1111-4111-8111-111111111111',
      targetUserId: ownerId,
      targetPetId: petId,
      senderName: 'Ada',
      senderEmail: 'ada@example.com',
      message: 'Interested',
      zipCode: '78701',
      sourceLinkId: created.body.id,
      sourceChannelKey: 'instagram',
      selfReportedSource: null,
      createdAt: '2026-02-02T00:00:00.000Z',
    });
    container.inquiryRepository.seed({
      id: '22222222-2222-4222-8222-222222222222',
      targetUserId: ownerId,
      targetPetId: petId,
      senderName: 'Bea',
      senderEmail: 'bea@example.com',
      message: 'Direct',
      zipCode: null,
      sourceLinkId: null,
      sourceChannelKey: null,
      selfReportedSource: null,
      createdAt: '2026-02-03T00:00:00.000Z',
    });

    const listed = await request(app)
      .get(`/pets/${petId}/links`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const withTotals = listed.body.find((row: { id: string }) => row.id === created.body.id);
    const withoutTotals = listed.body.find((row: { id: string }) => row.id === quiet.body.id);
    expect(withTotals).toMatchObject({ views: 10, inquiries: 1 });
    expect(withoutTotals).toMatchObject({ views: 0, inquiries: 0 });

    const patched = await request(app)
      .patch(`/links/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'still new totals' })
      .expect(200);
    expect(patched.body.views).toBe(0);
    expect(patched.body.inquiries).toBe(0);
  });
});
