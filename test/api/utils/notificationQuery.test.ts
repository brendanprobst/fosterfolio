import {
  decodeNotificationCursor,
  encodeNotificationCursor,
} from '@api/application/notifications/notificationQuery';

const ID = '0b6f6c1e-8f0a-4c4e-9d5b-2f1a3c4d5e6f';

function rawCursor(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

describe('notification cursor', () => {
  it('round-trips the timestamps Postgres and JavaScript produce', () => {
    for (const createdAt of [
      '2026-10-18T12:34:56.123456+00:00',
      '2026-10-18T12:34:56+00:00',
      '2026-10-18T12:34:56.123Z',
      '2026-10-18T07:34:56.1-05:00',
    ]) {
      const cursor = { createdAt, id: ID };
      expect(decodeNotificationCursor(encodeNotificationCursor(cursor))).toEqual(cursor);
    }
  });

  it('rejects fields that could change the PostgREST or=(…) filter', () => {
    const forged = [
      { createdAt: '2026-10-18T12:34:56Z),id.gt.(0', id: ID },
      { createdAt: '2026-10-18T12:34:56Z', id: `${ID}),recipient_id.neq.(x` },
      { createdAt: '2026-10-18T12:34:56Z,created_at.gt.2000-01-01', id: ID },
      { createdAt: '2026-10-18T12:34:56Z', id: 'not-a-uuid' },
      { createdAt: 'yesterday', id: ID },
      { createdAt: '2026-10-18', id: ID },
      { createdAt: '2026-13-45T12:34:56Z', id: ID },
      { createdAt: ' 2026-10-18T12:34:56Z', id: ID },
      { createdAt: 1_760_000_000_000, id: ID },
      { createdAt: '2026-10-18T12:34:56Z' },
    ];
    for (const value of forged) {
      expect({ value, decoded: decodeNotificationCursor(rawCursor(value)) }).toEqual({
        value,
        decoded: null,
      });
    }
  });

  it('rejects garbage that is not base64 JSON', () => {
    expect(decodeNotificationCursor('%%%')).toBeNull();
    expect(decodeNotificationCursor(rawCursor('a string'))).toBeNull();
    expect(decodeNotificationCursor(undefined)).toBeNull();
  });
});
