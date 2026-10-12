import type { NotificationCursor, NotificationStatus } from '@api/domain/repositories/INotificationRepository';

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

export function decodeNotificationCursor(raw: string | undefined): NotificationCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      createdAt?: unknown;
      id?: unknown;
    };
    if (typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') return null;
    if (!parsed.createdAt || !parsed.id) return null;
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}
