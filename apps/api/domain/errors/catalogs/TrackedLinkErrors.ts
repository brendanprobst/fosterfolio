import { ResultError } from '@api/domain/errors/ResultError';

export class TrackedLinkErrors {
  static readonly NOT_FOUND = ResultError.create(
    'TRACKED_LINK_NOT_FOUND',
    "We couldn't find that link.",
    404
  );

  static readonly FORBIDDEN = ResultError.create(
    'TRACKED_LINK_FORBIDDEN',
    'You can only manage links for pets you own.',
    403
  );

  static readonly INVALID_INPUT = ResultError.create(
    'TRACKED_LINK_INVALID_INPUT',
    'Please provide a valid channel and link details.',
    400
  );
}
