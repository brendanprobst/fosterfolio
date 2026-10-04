import { ResultError } from '@api/domain/errors/ResultError';

/** Auth / allowlist errors. Each entry carries its own HTTP status. */
export class AuthErrors {
  static readonly EMAIL_NOT_APPROVED = ResultError.create(
    'EMAIL_NOT_APPROVED',
    "This email isn't approved for Fosterfolio yet.",
    403
  );

  static readonly ALLOWLIST_UNAVAILABLE = ResultError.create(
    'ALLOWLIST_UNAVAILABLE',
    "We couldn't confirm your access just now. Try again in a moment.",
    503
  );
}
