import type { NotificationCursor, NotificationStatus } from '@api/domain/repositories/INotificationRepository';
import { isUuid } from '@api/domain/value-objects/UserHandle';

export function parseNotificationStatus(raw: string | undefined): NotificationStatus | null {
  if (raw == null || raw === '' || raw === 'unread') return 'unread';
  if (raw === 'all' || raw === 'archived') return raw;
  return null;
}

export function parseNotificationLimit(raw: string | undefined): number {
  if (raw == null || raw === '') return 20;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return 20;
  return Math.min(parsed, 50);
}

/** Optional `petId` filter; blank means unfiltered. */
export function parseNotificationPetId(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  return trimmed || undefined;
}

export function encodeNotificationCursor(cursor: NotificationCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

/** What Postgres timestamptz (`…:56.123456+00:00`) and `toISOString()` (`…:56.123Z`) emit. */
const CURSOR_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

function isCursorTimestamp(value: string): boolean {
  return CURSOR_TIMESTAMP_RE.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * The cursor comes back from the client and its fields go into a PostgREST `or=(…)` filter.
 * PostgREST parses that grammar after URL-decoding, so encoding alone doesn't stop a field from
 * closing the group. Accept only the shapes the server hands out: an ISO timestamp and a UUID.
 */
export function decodeNotificationCursor(raw: string | undefined): NotificationCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      createdAt?: unknown;
      id?: unknown;
    };
    if (typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') return null;
    if (!isCursorTimestamp(parsed.createdAt) || !isUuid(parsed.id)) return null;
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}
