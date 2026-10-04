import { ResultError } from '@api/domain/errors/ResultError';

/** Cross-cutting errors shared by every domain. */
export class CommonErrors {
  static readonly INTERNAL_SERVER_ERROR = ResultError.create(
    'INTERNAL_SERVER_ERROR',
    'Something went wrong on our end. Please try again later.',
    500
  );
}
