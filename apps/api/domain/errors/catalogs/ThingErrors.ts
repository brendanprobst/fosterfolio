import { ResultError } from '@api/domain/errors/ResultError';

/** Thing-domain errors. Each entry carries its own HTTP status. */
export class ThingErrors {
  static readonly NOT_FOUND = ResultError.create(
    'THING_NOT_FOUND',
    "We couldn't find that thing. It may have been removed.",
    404
  );

  static readonly NAME_INVALID = ResultError.create(
    'THING_NAME_INVALID',
    'Please provide a non-empty name for the thing.',
    400
  );
}
