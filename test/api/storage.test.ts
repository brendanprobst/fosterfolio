import request from 'supertest';
import {
  DEFAULT_STORAGE_CAP_BYTES,
  resolveStorageCapBytes,
  sanitizeUploadFilename,
} from '@api/application/use-cases/SignUploadUseCase';
import { createTestAppWithContainer } from './setup';
import { createAuthToken } from './support/authToken';

describe('Storage API', () => {
  const userId = '11111111-1111-1111-1111-111111111111';

  it('defaults storage cap to 50MB', () => {
    expect(DEFAULT_STORAGE_CAP_BYTES).toBe(50 * 1024 * 1024);
    expect(resolveStorageCapBytes(undefined)).toBe(DEFAULT_STORAGE_CAP_BYTES);
    expect(resolveStorageCapBytes('')).toBe(DEFAULT_STORAGE_CAP_BYTES);
    expect(resolveStorageCapBytes('209715200')).toBe(209715200);
  });

  it('sanitizes filenames and strips path segments', () => {
    expect(sanitizeUploadFilename('../../evil/photo.jpg')).toBe('photo.jpg');
    expect(sanitizeUploadFilename('my photo (1).JPG')).toBe('my_photo_1_.JPG');
    expect(sanitizeUploadFilename('')).toBeNull();
  });

  it('returns signed upload and public URLs with a random path suffix', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: userId, email: 'owner@example.com' });
    const token = await createAuthToken(userId, 'owner@example.com');

    const res = await request(app)
      .post('/storage/sign')
      .query({ filename: 'photo.jpg', contentType: 'image/jpeg' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.uploadUrl).toEqual(expect.any(String));
    expect(res.body.publicUrl).toEqual(expect.any(String));
    expect(res.body.path).toMatch(
      new RegExp(`^${userId}/[0-9a-f-]{36}-photo\\.jpg$`)
    );
    expect(res.body.capBytes).toBe(DEFAULT_STORAGE_CAP_BYTES);
    expect(res.body.usedBytes).toBe(0);
  });

  it('returns STORAGE_CAP_EXCEEDED with the client-facing message', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: userId, email: 'owner@example.com' });
    container.setStorageCapBytes(1024);
    container.storageAdapter.setUserStorageBytes(userId, 1024);
    const token = await createAuthToken(userId, 'owner@example.com');

    const res = await request(app)
      .post('/storage/sign')
      .query({ filename: 'photo.jpg', contentType: 'image/jpeg' })
      .set('Authorization', `Bearer ${token}`)
      .expect(413);

    expect(res.body.error).toMatchObject({
      status: 413,
      code: 'STORAGE_CAP_EXCEEDED',
      message: "You've used up your storage. Remove a photo to upload more.",
    });
  });

  it('rejects when contentLength would exceed the remaining cap', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: userId, email: 'owner@example.com' });
    container.setStorageCapBytes(1000);
    container.storageAdapter.setUserStorageBytes(userId, 900);
    const token = await createAuthToken(userId, 'owner@example.com');

    const res = await request(app)
      .post('/storage/sign')
      .query({
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
        contentLength: '200',
      })
      .set('Authorization', `Bearer ${token}`)
      .expect(413);

    expect(res.body.error.code).toBe('STORAGE_CAP_EXCEEDED');
  });

  it('rejects invalid content types and unauthenticated callers', async () => {
    const { app, container } = createTestAppWithContainer();
    container.seedUser({ id: userId, email: 'owner@example.com' });
    const token = await createAuthToken(userId, 'owner@example.com');

    const badType = await request(app)
      .post('/storage/sign')
      .query({ filename: 'doc.pdf', contentType: 'application/pdf' })
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect(badType.body.error.code).toBe('STORAGE_CONTENT_TYPE_INVALID');

    await request(app)
      .post('/storage/sign')
      .query({ filename: 'photo.jpg', contentType: 'image/jpeg' })
      .expect(401);
  });
});
