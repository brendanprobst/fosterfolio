import request from 'supertest';
import type { EmailAdapter, EmailMessage } from '@api/infrastructure/adapters/email/EmailAdapter';
import { createTestAppWithContainer } from './setup';

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

  it('returns 502 when email send fails after persist', async () => {
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
      .expect(502);
    expect(res.body.error.code).toBe('INQUIRY_EMAIL_FAILED');
    expect(container.inquiryRepository.records).toHaveLength(1);
  });
});
