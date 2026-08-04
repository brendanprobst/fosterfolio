import { ResultError } from '@api/domain/errors/ResultError';

export class UserErrors {
  static readonly NOT_FOUND = ResultError.create(
    'USER_NOT_FOUND',
    "We couldn't find that profile.",
    404
  );

  static readonly FORBIDDEN = ResultError.create(
    'USER_FORBIDDEN',
    'You can only update your own profile.',
    403
  );

  static readonly INVALID_INPUT = ResultError.create(
    'USER_INVALID_INPUT',
    'Please provide a valid profile update.',
    400
  );
}
