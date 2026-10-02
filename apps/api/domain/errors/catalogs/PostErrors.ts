import { ResultError } from '@api/domain/errors/ResultError';

export class PostErrors {
  static readonly NOT_FOUND = ResultError.create(
    'POST_NOT_FOUND',
    "We couldn't find that post. It may have been removed.",
    404
  );

  static readonly FORBIDDEN = ResultError.create(
    'POST_FORBIDDEN',
    'You can only change posts you authored.',
    403
  );

  static readonly INVALID_INPUT = ResultError.create(
    'POST_INVALID_INPUT',
    'Please provide valid post details.',
    400
  );

  static readonly TYPE_INVALID = ResultError.create(
    'POST_TYPE_INVALID',
    'Choose a general update or a pet update.',
    400
  );

  static readonly PET_REQUIRED = ResultError.create(
    'POST_PET_REQUIRED',
    'A pet update needs one of your pets.',
    400
  );
}
