import request from 'supertest';
import { createTestAppWithContainer } from './setup';
import { createAuthToken } from './support/authToken';

describe('Notifications API', () => {
  const ownerId = '11111111-1111-1111-1111-111111111111';

  async function sendInquiry(app: Parameters<typeof request>[0]) {
    return request(app)
      .post('/inquiries')
      .send({
        targetUserId: ownerId,
        senderName: 'Jamie',
        senderEmail: 'jamie@example.com',
        message: 'Hello from the lawn',
        zipCode: '94107',
        sourceChannelKey: 'direct',
      })
      .expect(201);
  }

  it('lists unread, all, and archived for the owner and hides another user', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'foster@example.com' });
    const token = await createAuthToken(ownerId, 'foster@example.com');
    const other = await createAuthToken('22222222-2222-2222-2222-222222222222', 'other@example.com');
    container.seedUser({
      id: '22222222-2222-2222-2222-222222222222',
      email: 'other@example.com',
    });

    const created = await sendInquiry(app);
    const unread = await request(app)
      .get('/me/notifications?status=unread')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(unread.body.items).toHaveLength(1);
    expect(unread.body.items[0]).toMatchObject({
      type: 'inquiry_received',
      readAt: null,
      pet: null,
      payload: {
        senderName: 'Jamie',
        senderEmail: 'jamie@example.com',
        zip: '94107',
        message: 'Hello from the lawn',
        sourceChannelKey: 'direct',
      },
    });
    expect(unread.body.items[0].id).toBe(container.notificationRepository.records[0]?.id);

    const count = await request(app)
      .get('/me/notifications/unread-count')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(count.body.count).toBe(1);

    await request(app)
      .get('/me/notifications')
      .set('Authorization', `Bearer ${other}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.items).toHaveLength(0);
      });

    await request(app)
      .patch(`/me/notifications/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ read: true })
      .expect(404);

    const notificationId = unread.body.items[0].id as string;
    const read = await request(app)
      .patch(`/me/notifications/${notificationId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ read: true })
      .expect(200);
    expect(read.body.readAt).toEqual(expect.any(String));

    const all = await request(app)
      .get('/me/notifications?status=all')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(all.body.items).toHaveLength(1);

    const stillUnread = await request(app)
      .get('/me/notifications?status=unread')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(stillUnread.body.items).toHaveLength(0);

    await request(app)
      .patch(`/me/notifications/${notificationId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ archived: true })
      .expect(200);

    const archived = await request(app)
      .get('/me/notifications?status=archived')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(archived.body.items).toHaveLength(1);
    expect(
      (
        await request(app)
          .get('/me/notifications?status=all')
          .set('Authorization', `Bearer ${token}`)
      ).body.items
    ).toHaveLength(0);
  });

  it('marks a read notification unread and keeps the first read timestamp', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'foster@example.com' });
    const token = await createAuthToken(ownerId, 'foster@example.com');
    await sendInquiry(app);

    const unread = await request(app)
      .get('/me/notifications?status=unread')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const notificationId = unread.body.items[0].id as string;

    const empty = await request(app)
      .patch(`/me/notifications/${notificationId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
    expect(empty.body.error.code).toBe('NOTIFICATION_INVALID_INPUT');

    const first = await request(app)
      .patch(`/me/notifications/${notificationId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ read: true })
      .expect(200);
    const second = await request(app)
      .patch(`/me/notifications/${notificationId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ read: true })
      .expect(200);
    expect(second.body.readAt).toBe(first.body.readAt);

    const markedUnread = await request(app)
      .patch(`/me/notifications/${notificationId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ read: false })
      .expect(200);
    expect(markedUnread.body.readAt).toBeNull();

    const count = await request(app)
      .get('/me/notifications/unread-count')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(count.body.count).toBe(1);
  });

  it('defaults inquiry email on and stores an off preference', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'foster@example.com' });
    const token = await createAuthToken(ownerId, 'foster@example.com');

    const defaults = await request(app)
      .get('/me/notification-preferences')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(defaults.body.preferences).toEqual([
      { type: 'inquiry_received', emailEnabled: true },
    ]);

    await request(app)
      .put('/me/notification-preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'inquiry_received', emailEnabled: false })
      .expect(200);

    await request(app)
      .post('/inquiries')
      .send({
        targetUserId: ownerId,
        senderName: 'Jamie',
        senderEmail: 'jamie@example.com',
        message: 'Hello',
      })
      .expect(201);
    expect(container.notificationRepository.records).toHaveLength(1);
    expect(container.notificationRepository.records[0]?.emailedAt).toBeNull();

    const unknown = await request(app)
      .put('/me/notification-preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'digest', emailEnabled: true })
      .expect(400);
    expect(unknown.body.error.code).toBe('NOTIFICATION_UNKNOWN_TYPE');
  });

  it('marks a missing pet unavailable', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'foster@example.com' });
    const token = await createAuthToken(ownerId, 'foster@example.com');
    const pet = await request(app)
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mochi', species: 'dog' })
      .expect(201);
    await request(app)
      .post('/inquiries')
      .send({
        targetUserId: ownerId,
        targetPetId: pet.body.id,
        senderName: 'Jamie',
        senderEmail: 'jamie@example.com',
        message: 'Hello',
      })
      .expect(201);
    await request(app)
      .delete(`/pets/${pet.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const listed = await request(app)
      .get('/me/notifications?status=all')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listed.body.items[0].pet).toEqual({
      id: pet.body.id,
      name: null,
      unavailable: true,
    });
  });
  it('filters inquiries to one pet with petId', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'foster@example.com' });
    const token = await createAuthToken(ownerId, 'foster@example.com');
    const createPet = (name: string) =>
      request(app)
        .post('/pets')
        .set('Authorization', `Bearer ${token}`)
        .send({ name, species: 'dog' })
        .expect(201);
    const mochi = await createPet('Mochi');
    const biscuit = await createPet('Biscuit');
    for (const petId of [mochi.body.id, biscuit.body.id, mochi.body.id]) {
      await request(app)
        .post('/inquiries')
        .send({
          targetUserId: ownerId,
          targetPetId: petId,
          senderName: 'Jamie',
          senderEmail: 'jamie@example.com',
          message: 'Hello',
        })
        .expect(201);
    }
    await sendInquiry(app);

    const filtered = await request(app)
      .get(`/me/notifications?status=all&petId=${mochi.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(filtered.body.items).toHaveLength(2);
    for (const item of filtered.body.items) expect(item.pet.id).toBe(mochi.body.id);

    const unfiltered = await request(app)
      .get('/me/notifications?status=all&petId=')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(unfiltered.body.items).toHaveLength(4);
  });
});
