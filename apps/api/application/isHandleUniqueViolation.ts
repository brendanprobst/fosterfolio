/**
 * PostgREST unique violations surface as
 * `Supabase request failed (409): {"code":"23505",...}`.
 * Only the handle unique index should map to HANDLE_TAKEN — not email or other 409s.
 */
export function isHandleUniqueViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (message.includes('users_handle_unique')) return true;
  return message.includes('23505') && /\bhandle\b/i.test(message);
}
