import { createHmac } from 'crypto';
import request from 'supertest';
import type { EmailAdapter, EmailMessage } from '@api/infrastructure/adapters/email/EmailAdapter';
import { createTestAppWithContainer } from './setup';
import { createAuthToken } from './support/authToken';

describe('Inquiries API', () => {
  const ownerId = '11111111-1111-1111-1111-111111111111';

  it('persists inquiry and emails foster with Reply-To sender', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'foster@example.com' });

    const sent: EmailMessage[] = [];
    const adapter: EmailAdapter = {
      send: async (message) => {
        sent.push(message);
      },
    };
    container.setEmailAdapter(adapter);

    const res = await request(app)
      .post('/inquiries')
      .send({
        targetUserId: ownerId,
        senderName: 'Jamie',
        senderEmail: 'jamie@example.com',
        message: 'Can I meet Mochi this weekend?',
      })
      .expect(201);

    expect(res.body).toMatchObject({
      targetUserId: ownerId,
      senderName: 'Jamie',
      senderEmail: 'jamie@example.com',
    });
    expect(container.inquiryRepository.records).toHaveLength(1);
    expect(container.inquiryRepository.records[0]?.viaFosterMe).toBe(false);
    expect(container.notificationRepository.records).toHaveLength(1);
    expect(container.notificationRepository.records[0]).toMatchObject({
      type: 'inquiry_received',
      entityType: 'inquiry',
      entityId: res.body.id,
    });
    expect(container.notificationRepository.records[0]?.emailedAt).toEqual(expect.any(String));
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      to: 'foster@example.com',
      replyTo: 'jamie@example.com',
    });
  });

  it('returns 404 when target user is missing', async () => {
    const { app } = createTestAppWithContainer();
    const res = await request(app)
      .post('/inquiries')
      .send({
        targetUserId: '99999999-9999-9999-9999-999999999999',
        senderName: 'Jamie',
        senderEmail: 'jamie@example.com',
        message: 'Hello',
      })
      .expect(404);
    expect(res.body.error.code).toBe('INQUIRY_TARGET_NOT_FOUND');
  });

  it('stores viaFosterMe when the visitor reached the pet from foster-me', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'foster@example.com' });
    container.setEmailAdapter({
      send: async () => {},
    });

    await request(app)
      .post('/inquiries')
      .send({
        targetUserId: ownerId,
        senderName: 'Jamie',
        senderEmail: 'jamie@example.com',
        message: 'Saw them on the foster-me page',
        viaFosterMe: true,
      })
      .expect(201);

    expect(container.inquiryRepository.records[0]?.viaFosterMe).toBe(true);
  });

  it('keeps the inquiry and in-app row when email send fails', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'foster@example.com' });
    container.setEmailAdapter({
      send: async () => {
        throw new Error('SES down');
      },
    });

    const res = await request(app)
      .post('/inquiries')
      .send({
        targetUserId: ownerId,
        senderName: 'Jamie',
        senderEmail: 'jamie@example.com',
        message: 'Hello',
      })
      .expect(201);
    expect(container.inquiryRepository.records).toHaveLength(1);
    expect(container.notificationRepository.records).toHaveLength(1);
    expect(container.notificationRepository.records[0]?.emailedAt).toBeNull();
  });

  it('stores zip and source, drops a link for another pet, and accepts an archived link', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'foster@example.com' });
    const token = await createAuthToken(ownerId, 'foster@example.com');
    const petRes = await request(app)
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mochi', species: 'dog' })
      .expect(201);
    const otherPet = await request(app)
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Beans', species: 'cat' })
      .expect(201);
    const linkRes = await request(app)
      .post(`/pets/${petRes.body.id}/links`)
      .set('Authorization', `Bearer ${token}`)
      .send({ channelKey: 'instagram' })
      .expect(201);
    await request(app)
      .patch(`/links/${linkRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ archived: true })
      .expect(200);

    const mismatch = await request(app)
      .post('/inquiries')
      .send({
        targetUserId: ownerId,
        targetPetId: otherPet.body.id,
        senderName: 'Jamie',
        senderEmail: 'jamie@example.com',
        message: 'Hello',
        sourceLinkId: linkRes.body.id,
        sourceChannelKey: 'instagram',
      })
      .expect(201);
    expect(inquiryById(container, mismatch.body.id)).toMatchObject({
      sourceLinkId: null,
      sourceChannelKey: 'instagram',
    });

    const sent: EmailMessage[] = [];
    container.setEmailAdapter({
      send: async (message) => {
        sent.push(message);
      },
    });
    const res = await request(app)
      .post('/inquiries')
      .send({
        targetUserId: ownerId,
        targetPetId: petRes.body.id,
        senderName: 'Jamie',
        senderEmail: 'jamie@example.com',
        message: 'Hello from a flyer',
        zipCode: '94107',
        sourceLinkId: linkRes.body.id,
        sourceChannelKey: 'wrong',
      })
      .expect(201);

    expect(res.body.sourceToken).toEqual(expect.any(String));
    expect(inquiryById(container, res.body.id)).toMatchObject({
      zipCode: '94107',
      sourceLinkId: linkRes.body.id,
      sourceChannelKey: 'instagram',
    });
    expect(sent[0]?.text).not.toContain('94107');
  });

  it('credits a foster-me link on a pet inquiry and on a profile inquiry', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'foster@example.com' });
    const token = await createAuthToken(ownerId, 'foster@example.com');
    const pet = await request(app)
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mochi', species: 'dog' })
      .expect(201);
    const link = await request(app)
      .post('/me/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ channelKey: 'lawn_sign', label: 'Front yard' })
      .expect(201);
    container.setEmailAdapter({ send: async () => {} });

    const viaPet = await request(app)
      .post('/inquiries')
      .send({
        targetUserId: ownerId,
        targetPetId: pet.body.id,
        senderName: 'Jamie',
        senderEmail: 'jamie@example.com',
        message: 'Saw your lawn sign, can I meet Mochi?',
        sourceLinkId: link.body.id,
        sourceChannelKey: 'wrong',
        viaFosterMe: true,
      })
      .expect(201);
    expect(inquiryById(container, viaPet.body.id)).toMatchObject({
      targetPetId: pet.body.id,
      sourceLinkId: link.body.id,
      sourceChannelKey: 'lawn_sign',
      viaFosterMe: true,
    });
    expect(notificationFor(container, viaPet.body.id)?.payload).toMatchObject({
      linkLabel: 'Front yard',
      sourceChannelKey: 'lawn_sign',
    });

    const viaProfile = await request(app)
      .post('/inquiries')
      .send({
        targetUserId: ownerId,
        senderName: 'Jamie',
        senderEmail: 'jamie@example.com',
        message: 'Saw your lawn sign, who is available?',
        sourceLinkId: link.body.id,
        sourceChannelKey: 'lawn_sign',
      })
      .expect(201);
    expect(inquiryById(container, viaProfile.body.id)).toMatchObject({
      targetPetId: null,
      sourceLinkId: link.body.id,
      sourceChannelKey: 'lawn_sign',
    });
  });

  it('saves the inquiry without the link when the link cannot be credited', async () => {
    const { app, container } = createTestAppWithContainer();
    const otherOwnerId = '22222222-2222-4222-8222-222222222222';
    container.seedUser({ id: ownerId, email: 'foster@example.com' });
    container.seedUser({ id: otherOwnerId, email: 'other@example.com' });
    const token = await createAuthToken(ownerId, 'foster@example.com');
    const otherToken = await createAuthToken(otherOwnerId, 'other@example.com');
    const pet = await request(app)
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mochi', species: 'dog' })
      .expect(201);
    const petLink = await request(app)
      .post(`/pets/${pet.body.id}/links`)
      .set('Authorization', `Bearer ${token}`)
      .send({ channelKey: 'flyer' })
      .expect(201);
    const otherOwnersLink = await request(app)
      .post('/me/links')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ channelKey: 'instagram' })
      .expect(201);

    const cases = [
      { label: "another owner's link", sourceLinkId: otherOwnersLink.body.id, targetPetId: pet.body.id },
      { label: 'a pet link on a profile inquiry', sourceLinkId: petLink.body.id, targetPetId: undefined },
      { label: 'an unknown link', sourceLinkId: '33333333-3333-4333-8333-333333333333', targetPetId: pet.body.id },
      { label: 'a malformed link id', sourceLinkId: 'not-a-uuid', targetPetId: pet.body.id },
    ];
    for (const { label, sourceLinkId, targetPetId } of cases) {
      const res = await request(app)
        .post('/inquiries')
        .send({
          targetUserId: ownerId,
          ...(targetPetId ? { targetPetId } : {}),
          senderName: 'Jamie',
          senderEmail: 'jamie@example.com',
          message: `Hello via ${label}`,
          sourceLinkId,
          sourceChannelKey: 'instagram',
        });
      expect({ label, status: res.status }).toEqual({ label, status: 201 });
      expect(inquiryById(container, res.body.id)).toMatchObject({
        sourceLinkId: null,
        sourceChannelKey: 'instagram',
      });
      // Another owner's link label must not reach this owner's inbox.
      expect(notificationFor(container, res.body.id)?.payload).toMatchObject({ linkLabel: null });
    }
  });

  it('rejects a sender email that would inject mailto: headers', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'foster@example.com' });
    const sent: EmailMessage[] = [];
    container.setEmailAdapter({
      send: async (message) => {
        sent.push(message);
      },
    });

    for (const senderEmail of [
      'a@b.co?bcc=evil%40x.com&body=hi',
      'a@b.co,evil@x.com',
      'Jamie <jamie@example.com>',
    ]) {
      const res = await request(app)
        .post('/inquiries')
        .send({ targetUserId: ownerId, senderName: 'Jamie', senderEmail, message: 'Hello' })
        .expect(400);
      expect(res.body.error.code).toBe('INQUIRY_INVALID_INPUT');
    }
    expect(container.inquiryRepository.records).toHaveLength(0);
    expect(container.notificationRepository.records).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it('accepts an inquiry with no Turnstile token when the secret is unset', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'foster@example.com' });
    await request(app)
      .post('/inquiries')
      .send({
        targetUserId: ownerId,
        senderName: 'Jamie',
        senderEmail: 'jamie@example.com',
        message: 'Hello',
      })
      .expect(201);
  });

  it('rejects a missing Turnstile token when the secret is set', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'foster@example.com' });
    container.setTurnstileSecret('turnstile-secret', async () => true);
    const res = await request(app)
      .post('/inquiries')
      .send({
        targetUserId: ownerId,
        senderName: 'Jamie',
        senderEmail: 'jamie@example.com',
        message: 'Hello',
      })
      .expect(400);
    expect(res.body.error.code).toBe('INQUIRY_TURNSTILE_FAILED');
    expect(container.inquiryRepository.records).toHaveLength(0);
  });

  it('rejects a source token forged with the old committed signing key', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'foster@example.com' });
    const created = await request(app)
      .post('/inquiries')
      .send({
        targetUserId: ownerId,
        senderName: 'Jamie',
        senderEmail: 'jamie@example.com',
        message: 'Hello',
      })
      .expect(201);
    const forgedSig = createHmac('sha256', 'fosterfolio-dev-inquiry-source-token')
      .update(created.body.id)
      .digest('base64url');

    const res = await request(app)
      .patch(`/inquiries/${created.body.id}/self-reported-source`)
      .send({ token: `${created.body.id}.${forgedSig}`, selfReportedSource: 'Shelter' })
      .expect(400);
    expect(res.body.error.code).toBe('INQUIRY_SOURCE_TOKEN_INVALID');
    expect(inquiryById(container, created.body.id)?.selfReportedSource).toBeNull();
  });

  it('accepts one self-reported source within 30 minutes and rejects a second write or an expired token', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'foster@example.com' });
    const created = await request(app)
      .post('/inquiries')
      .send({
        targetUserId: ownerId,
        senderName: 'Jamie',
        senderEmail: 'jamie@example.com',
        message: 'Hello',
        sourceChannelKey: 'direct',
      })
      .expect(201);

    const saved = await request(app)
      .patch(`/inquiries/${created.body.id}/self-reported-source`)
      .send({ token: created.body.sourceToken, selfReportedSource: 'Shelter' })
      .expect(200);
    expect(saved.body.selfReportedSource).toBe('Shelter');

    const again = await request(app)
      .patch(`/inquiries/${created.body.id}/self-reported-source`)
      .send({ token: created.body.sourceToken, selfReportedSource: 'Search' })
      .expect(400);
    expect(again.body.error.code).toBe('INQUIRY_SOURCE_TOKEN_INVALID');
    expect(container.inquiryRepository.records[0]?.selfReportedSource).toBe('Shelter');

    const second = await request(app)
      .post('/inquiries')
      .send({
        targetUserId: ownerId,
        senderName: 'Jamie',
        senderEmail: 'jamie@example.com',
        message: 'Another',
      })
      .expect(201);
    const record = container.inquiryRepository.records.find((row) => row.id === second.body.id);
    expect(record).toBeTruthy();
    record!.createdAt = new Date(Date.now() - 31 * 60 * 1000).toISOString();

    const expired = await request(app)
      .patch(`/inquiries/${second.body.id}/self-reported-source`)
      .send({ token: second.body.sourceToken, selfReportedSource: 'Other' })
      .expect(400);
    expect(expired.body.error.code).toBe('INQUIRY_SOURCE_TOKEN_INVALID');
    expect(record!.selfReportedSource).toBeNull();
  });
});

function inquiryById(container: ReturnType<typeof createTestAppWithContainer>['container'], id: string) {
  return container.inquiryRepository.records.find((row) => row.id === id);
}

function notificationFor(
  container: ReturnType<typeof createTestAppWithContainer>['container'],
  inquiryId: string
) {
  return container.notificationRepository.records.find((row) => row.entityId === inquiryId);
}
