import { ensureInquiryReceivedRegistered, INQUIRY_RECEIVED_TYPE } from '@api/application/notifications/inquiryReceived';
import type { INotificationRepository } from '@api/domain/repositories/INotificationRepository';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import { getNotificationType, listNotificationTypes } from '@lattice/notifications';
import { logUnexpectedError } from '@api/utils/logUnexpectedError';

export type NotificationPreferenceDto = {
  type: string;
  emailEnabled: boolean;
};

export class GetNotificationPreferencesUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(userId: string): Promise<Result<{ preferences: NotificationPreferenceDto[] }>> {
    ensureInquiryReceivedRegistered();
    try {
      const stored = await this.notificationRepository.listPreferences(userId);
      const preferences = listNotificationTypes().map((registration) => {
        const row = stored.find((item) => item.type === registration.type);
        return {
          type: registration.type,
          emailEnabled: row ? row.emailEnabled : registration.defaultEmailEnabled,
        };
      });
      if (preferences.length === 0) {
        preferences.push({ type: INQUIRY_RECEIVED_TYPE, emailEnabled: true });
      }
      return Result.success({ preferences });
    } catch (error) {
      logUnexpectedError('GetNotificationPreferencesUseCase', error);
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}

export class PutNotificationPreferenceUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(
    userId: string,
    type: string,
    emailEnabled: boolean
  ): Promise<Result<NotificationPreferenceDto>> {
    ensureInquiryReceivedRegistered();
    if (!getNotificationType(type)) {
      return Result.failure(ErrorCatalog.NOTIFICATION_UNKNOWN_TYPE);
    }
    if (typeof emailEnabled !== 'boolean') {
      return Result.failure(ErrorCatalog.NOTIFICATION_INVALID_INPUT);
    }
    try {
      const saved = await this.notificationRepository.upsertPreference(userId, type, emailEnabled);
      return Result.success({ type: saved.type, emailEnabled: saved.emailEnabled });
    } catch (error) {
      logUnexpectedError('GetNotificationPreferencesUseCase', error);
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
