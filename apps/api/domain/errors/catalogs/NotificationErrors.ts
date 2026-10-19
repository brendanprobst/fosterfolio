import { ResultError } from '@api/domain/errors/ResultError';

export class NotificationErrors {
  static readonly NOT_FOUND = ResultError.create(
    'NOTIFICATION_NOT_FOUND',
    'Notification not found.',
    404
  );

  static readonly INVALID_INPUT = ResultError.create(
    'NOTIFICATION_INVALID_INPUT',
    'Notification update is invalid.',
    400
  );

  static readonly INVALID_STATUS = ResultError.create(
    'NOTIFICATION_INVALID_STATUS',
    'Status must be unread, all, or archived.',
    400
  );

  static readonly UNKNOWN_TYPE = ResultError.create(
    'NOTIFICATION_UNKNOWN_TYPE',
    'Unknown notification type.',
    400
  );
}
