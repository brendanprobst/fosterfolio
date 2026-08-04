import { ResultError } from '@api/domain/errors/ResultError';

/** Auth / allowlist errors. Each entry carries its own HTTP status. */
export class AuthErrors {
  static readonly EMAIL_NOT_APPROVED = ResultError.create(
    'EMAIL_NOT_APPROVED',
    'Account email is not approved for access.',
    403
  );

  static readonly ALLOWLIST_UNAVAILABLE = ResultError.create(
    'ALLOWLIST_UNAVAILABLE',
    'Access check temporarily unavailable.',
    503
  );
}
