import request from 'supertest';
import type { AnalyticsDailyRecord } from '@api/domain/repositories/IAnalyticsDailyRepository';
import type { InquiryRecord } from '@api/domain/repositories/IInquiryRepository';
import { createTestAppWithContainer } from './setup';
import { createAuthToken } from './support/authToken';

const ownerId = '11111111-1111-1111-1111-111111111111';
const otherId = '22222222-2222-2222-2222-222222222222';

function utcDay(offset: number): string {
  const day = new Date();
  day.setUTCHours(12, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
}

function inquiry(
  id: string,
  petId: string,
  createdAt: string,
  source: { sourceLinkId: string | null; sourceChannelKey: string | null }
): InquiryRecord {
  return {
    id,
    targetUserId: ownerId,
    targetPetId: petId,
    senderName: 'Ada',
    senderEmail: 'ada@example.com',
    message: 'hello',
    zipCode: '78701',
    sourceLinkId: source.sourceLinkId,
    sourceChannelKey: source.sourceChannelKey,
    viaFosterMe: false,
    selfReportedSource: null,
    createdAt,
  };
}

describe('pet analytics API', () => {
  async function createOwnedPet(app: ReturnType<typeof createTestAppWithContainer>['app']) {
    const token = await createAuthToken(ownerId, 'owner@example.com');
    const res = await request(app)
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mochi', species: 'dog' })
      .expect(201);
    return { petId: res.body.id as string, token };
  }

  async function seedRollup() {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    container.seedUser({ id: otherId, email: 'other@example.com' });
    const { petId, token } = await createOwnedPet(app);
    const otherToken = await createAuthToken(otherId, 'other@example.com');

    const linkA = await request(app)
      .post(`/pets/${petId}/links`)
      .set('Authorization', `Bearer ${token}`)
      .send({ channelKey: 'instagram' })
      .expect(201);
    const linkB = await request(app)
      .post(`/pets/${petId}/links`)
      .set('Authorization', `Bearer ${token}`)
      .send({ channelKey: 'lawn_sign' })
      .expect(201);

    const daily: AnalyticsDailyRecord[] = [
      {
        petId,
        linkId: linkA.body.id,
        channelKey: 'instagram',
        city: 'Austin',
        day: utcDay(-1),
        views: 4,
        approxVisitors: 3,
        formOpens: 2,
      },
      {
        petId,
        linkId: linkA.body.id,
        channelKey: 'instagram',
        city: null,
        day: utcDay(-1),
        views: 1,
        approxVisitors: 1,
        formOpens: 0,
      },
      {
        petId,
        linkId: linkB.body.id,
        channelKey: 'lawn_sign',
        city: 'Austin',
        day: utcDay(-2),
        views: 10,
        approxVisitors: 8,
        formOpens: 1,
      },
      {
        petId,
        linkId: null,
        channelKey: 'direct',
        city: null,
        day: utcDay(-20),
        views: 100,
        approxVisitors: 50,
        formOpens: 0,
      },
      {
        petId,
        linkId: linkA.body.id,
        channelKey: 'instagram',
        city: 'Austin',
        day: utcDay(-40),
        views: 7,
        approxVisitors: 7,
        formOpens: 0,
      },
    ];
    for (const row of daily) container.analyticsDailyRepository.seed(row);

    container.inquiryRepository.seed(
      inquiry('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', petId, `${utcDay(-1)}T12:00:00.000Z`, {
        sourceLinkId: linkA.body.id,
        sourceChannelKey: 'instagram',
      })
    );
    container.inquiryRepository.seed(
      inquiry('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', petId, `${utcDay(-1)}T13:00:00.000Z`, {
        sourceLinkId: linkA.body.id,
        sourceChannelKey: 'instagram',
      })
    );
    container.inquiryRepository.seed(
      inquiry('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', petId, `${utcDay(-1)}T14:00:00.000Z`, {
        sourceLinkId: null,
        sourceChannelKey: null,
      })
    );
    container.inquiryRepository.seed(
      inquiry('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', petId, `${utcDay(-20)}T12:00:00.000Z`, {
        sourceLinkId: linkB.body.id,
        sourceChannelKey: 'lawn_sign',
      })
    );
    container.inquiryRepository.seed(
      inquiry('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', petId, `${utcDay(-40)}T12:00:00.000Z`, {
        sourceLinkId: null,
        sourceChannelKey: 'direct',
      })
    );

    return {
      app,
      petId,
      token,
      otherToken,
      linkAId: linkA.body.id as string,
      linkBId: linkB.body.id as string,
    };
  }

  it('returns owner rollup analytics and counts inquiries from the inquiries table', async () => {
    const { app, petId, token, otherToken, linkAId, linkBId } = await seedRollup();

    const res = await request(app)
      .get(`/pets/${petId}/analytics`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(JSON.stringify(res.body)).not.toContain('ada@example.com');
    expect(JSON.stringify(res.body)).not.toContain('78701');
    expect(res.body.funnel).toEqual({
      views: 115,
      formOpens: 3,
      inquiries: 4,
      conversionRate: 4 / 115,
    });
    expect(res.body.byChannel).toEqual([
      { channelKey: 'direct', views: 100, inquiries: 0 },
      { channelKey: 'lawn_sign', views: 10, inquiries: 1 },
      { channelKey: 'instagram', views: 5, inquiries: 2 },
    ]);
    expect(res.body.byCity).toEqual([{ city: 'Austin', views: 14 }]);
    expect(res.body.byLink).toEqual([
      { linkId: linkBId, channelKey: 'lawn_sign', views: 10, inquiries: 1 },
      { linkId: linkAId, channelKey: 'instagram', views: 5, inquiries: 2 },
    ]);
    expect(res.body.viewsByDay).toEqual([
      { day: utcDay(-20), views: 100 },
      { day: utcDay(-2), views: 10 },
      { day: utcDay(-1), views: 5 },
    ]);
    expect(res.body.inquiriesByDay).toEqual([
      { day: utcDay(-20), inquiries: 1 },
      { day: utcDay(-1), inquiries: 3 },
    ]);

    const week = await request(app)
      .get(`/pets/${petId}/analytics?range=7d`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(week.body.funnel).toMatchObject({ views: 15, formOpens: 3, inquiries: 3 });
    expect(week.body.byChannel.map((row: { channelKey: string }) => row.channelKey)).not.toContain(
      'direct'
    );

    const all = await request(app)
      .get(`/pets/${petId}/analytics?range=all`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(all.body.funnel).toMatchObject({ views: 122, inquiries: 5 });

    const summary = await request(app)
      .get(`/pets/${petId}/analytics/summary`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(summary.body).toEqual({
      views: 15,
      inquiries: 3,
      topChannel: { channelKey: 'lawn_sign', views: 10 },
    });

    const forbidden = await request(app)
      .get(`/pets/${petId}/analytics`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
    expect(forbidden.body.error.code).toBe('ANALYTICS_FORBIDDEN');

    const missing = await request(app)
      .get('/pets/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa99/analytics')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
    expect(missing.body.error.code).toBe('PET_NOT_FOUND');

    await request(app).get(`/pets/${petId}/analytics`).expect(401);
    await request(app).get(`/pets/${petId}/analytics/summary`).expect(401);

    const badRange = await request(app)
      .get(`/pets/${petId}/analytics?range=90d`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect(badRange.body.error.code).toBe('ANALYTICS_INVALID_RANGE');
  });

  it('scopes byLink to the requested range', async () => {
    const { app, petId, token, linkAId } = await seedRollup();

    const week = await request(app)
      .get(`/pets/${petId}/analytics?range=7d`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(week.body.byLink.find((row: { linkId: string }) => row.linkId === linkAId)).toMatchObject({
      views: 5,
    });

    const all = await request(app)
      .get(`/pets/${petId}/analytics?range=all`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(all.body.byLink.find((row: { linkId: string }) => row.linkId === linkAId)).toMatchObject({
      views: 12,
    });
  });

  it('returns a null conversion rate and a null top channel when there are no views', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: ownerId, email: 'owner@example.com' });
    const { petId, token } = await createOwnedPet(app);
    container.inquiryRepository.seed(
      inquiry('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', petId, `${utcDay(0)}T12:00:00.000Z`, {
        sourceLinkId: null,
        sourceChannelKey: null,
      })
    );

    const res = await request(app)
      .get(`/pets/${petId}/analytics?range=7d`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.funnel).toEqual({
      views: 0,
      formOpens: 0,
      inquiries: 1,
      conversionRate: null,
    });
    expect(res.body.byChannel).toEqual([]);
    expect(res.body.byCity).toEqual([]);

    const summary = await request(app)
      .get(`/pets/${petId}/analytics/summary`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(summary.body).toEqual({ views: 0, inquiries: 1, topChannel: null });
  });
});
