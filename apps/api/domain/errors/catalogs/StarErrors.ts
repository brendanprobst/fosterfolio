import { ResultError } from '@api/domain/errors/ResultError';

export class StarErrors {
  static readonly INVALID_INPUT = ResultError.create(
    'STAR_INVALID_INPUT',
    'session_token is required.',
    400
  );

  static readonly USER_NOT_FOUND = ResultError.create(
    'STAR_USER_NOT_FOUND',
    "We couldn't find that profile to star.",
    404
  );
}
