import { ResultError } from '@api/domain/errors/ResultError';

export class AnalyticsErrors {
  static readonly FORBIDDEN = ResultError.create(
    'ANALYTICS_FORBIDDEN',
    'You can only view analytics for pets you own.',
    403
  );

  static readonly INVALID_RANGE = ResultError.create(
    'ANALYTICS_INVALID_RANGE',
    'Range must be 7d, 30d, or all.',
    400
  );
}
