import request from 'supertest';
import type { AnalyticsOwnerDailyRecord } from '@api/domain/repositories/IAnalyticsOwnerDailyRepository';
import type { InquiryRecord } from '@api/domain/repositories/IInquiryRepository';
import { createTestAppWithContainer } from './setup';
import { createAuthToken } from './support/authToken';

const ownerId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';

function utcDay(offset: number): string {
  const day = new Date();
  day.setUTCHours(12, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
}

function inquiry(
  id: string,
  createdAt: string,
  sourceLinkId: string | null,
  viaFosterMe: boolean
): InquiryRecord {
  return {
    id,
    targetUserId: ownerId,
    targetPetId: null,
    senderName: 'Ada',
    senderEmail: 'ada@example.com',
    message: 'hello',
    zipCode: null,
    sourceLinkId,
    sourceChannelKey: sourceLinkId ? 'lawn_sign' : null,
    viaFosterMe,
    selfReportedSource: null,
    createdAt,
  };
}

describe('owner link analytics API', () => {
  async function seed() {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    container.seedUser({ id: otherId, email: 'other@example.com' });
    const token = await createAuthToken(ownerId, 'owner@example.com');
    const otherToken = await createAuthToken(otherId, 'other@example.com');

    const quiet = await request(app)
      .post('/me/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ channelKey: 'instagram' })
      .expect(201);
    const archived = await request(app)
      .post('/me/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ channelKey: 'lawn_sign' })
      .expect(201);
    await request(app)
      .patch(`/links/${archived.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ archived: true })
      .expect(200);

    const daily: AnalyticsOwnerDailyRecord[] = [
      {
        ownerId,
        linkId: quiet.body.id,
        channelKey: 'instagram',
        city: 'Austin',
        day: utcDay(-1),
        views: 4,
        approxVisitors: 3,
        petTaps: 1,
      },
      {
        ownerId,
        linkId: archived.body.id,
        channelKey: 'lawn_sign',
        city: null,
        day: utcDay(-2),
        views: 10,
        approxVisitors: 8,
        petTaps: 3,
      },
      {
        ownerId,
        linkId: null,
        channelKey: 'direct',
        city: null,
        day: utcDay(-1),
        views: 2,
        approxVisitors: 2,
        petTaps: 1,
      },
      {
        ownerId,
        linkId: quiet.body.id,
        channelKey: 'instagram',
        city: null,
        day: utcDay(-40),
        views: 100,
        approxVisitors: 40,
        petTaps: 20,
      },
    ];
    for (const row of daily) container.analyticsOwnerDailyRepository.seed(row);

    container.inquiryRepository.seed(
      inquiry('inq-archived', `${utcDay(-2)}T15:00:00.000Z`, archived.body.id, true)
    );
    container.inquiryRepository.seed(
      inquiry('inq-untagged', `${utcDay(-1)}T15:00:00.000Z`, null, true)
    );
    container.inquiryRepository.seed(
      inquiry('inq-direct', `${utcDay(-1)}T16:00:00.000Z`, quiet.body.id, false)
    );
    container.inquiryRepository.seed(
      inquiry('inq-old', `${utcDay(-40)}T15:00:00.000Z`, archived.body.id, true)
    );

    return { app, token, otherToken, quietId: quiet.body.id as string, archivedId: archived.body.id as string };
  }

  it('returns zeros when the owner has no foster-me traffic', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    const token = await createAuthToken(ownerId, 'owner@example.com');
    const res = await request(app)
      .get('/me/links/analytics')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toEqual({
      funnel: { previewViews: 0, petTaps: 0, inquiries: 0 },
      byLink: [],
      previewViewsByDay: [],
      inquiriesByDay: [],
    });
  });

  it('counts archived links, views without inquiries, and untagged traffic', async () => {
    const { app, token, quietId, archivedId } = await seed();
    const res = await request(app)
      .get('/me/links/analytics?range=30d')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.funnel).toEqual({ previewViews: 16, petTaps: 5, inquiries: 2 });
    expect(res.body.byLink).toEqual([
      { linkId: archivedId, previewViews: 10, petTaps: 3, inquiries: 1 },
      { linkId: quietId, previewViews: 4, petTaps: 1, inquiries: 0 },
      { linkId: null, previewViews: 2, petTaps: 1, inquiries: 1 },
    ]);
    expect(res.body.previewViewsByDay).toEqual([
      { day: utcDay(-2), previewViews: 10 },
      { day: utcDay(-1), previewViews: 6 },
    ]);
    expect(res.body.inquiriesByDay).toEqual([
      { day: utcDay(-2), inquiries: 1 },
      { day: utcDay(-1), inquiries: 1 },
    ]);
  });

  it('includes every day when range is all, and hides another owner', async () => {
    const { app, token, otherToken, archivedId } = await seed();
    const all = await request(app)
      .get('/me/links/analytics?range=all')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(all.body.funnel).toEqual({ previewViews: 116, petTaps: 25, inquiries: 3 });
    expect(all.body.byLink.find((row: { linkId: string }) => row.linkId === archivedId)).toMatchObject({
      previewViews: 10,
      inquiries: 2,
    });

    const other = await request(app)
      .get('/me/links/analytics?range=all')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);
    expect(other.body.funnel).toEqual({ previewViews: 0, petTaps: 0, inquiries: 0 });
  });

  it('rejects a bad range and a missing token', async () => {
    const { app, token } = await seed();
    await request(app)
      .get('/me/links/analytics?range=90d')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    await request(app).get('/me/links/analytics').expect(401);
  });
});
