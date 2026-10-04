/**
 * Unique vanity slug for /@handle URLs.
 * Stored lowercase only; callers must persist `value`, not the raw input.
 */
const HANDLE_PATTERN = /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/;

const BLOCKLIST = new Set([
  'admin',
  'support',
  'fosterfolio',
  'official',
  '00000000-0000-0000-0000-000000000000',
]);

export type UserHandleFailure = 'invalid' | 'blocklisted';

export class UserHandle {
  private constructor(readonly value: string) {}

  static normalize(raw: string): string {
    return raw.trim().replace(/^@+/, '').toLowerCase();
  }

  static parse(
    raw: string
  ): { ok: true; handle: UserHandle } | { ok: false; reason: UserHandleFailure } {
    const value = UserHandle.normalize(raw);
    if (!value || !HANDLE_PATTERN.test(value)) {
      return { ok: false, reason: 'invalid' };
    }
    if (BLOCKLIST.has(value)) {
      return { ok: false, reason: 'blocklisted' };
    }
    return { ok: true, handle: new UserHandle(value) };
  }
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
