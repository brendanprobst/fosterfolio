import type { INotificationRepository } from '@api/domain/repositories/INotificationRepository';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { NotificationRecord } from '@lattice/notifications';
import { logUnexpectedError } from '@api/utils/logUnexpectedError';

export type UpdateNotificationCommand = {
  read?: boolean;
  archived?: boolean;
};

export class UpdateNotificationUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(
    recipientId: string,
    id: string,
    command: UpdateNotificationCommand
  ): Promise<Result<NotificationRecord>> {
    const hasRead = typeof command.read === 'boolean';
    const hasArchive = typeof command.archived === 'boolean';
    if (!hasRead && !hasArchive) {
      return Result.failure(ErrorCatalog.NOTIFICATION_INVALID_INPUT);
    }
    try {
      const existing = await this.notificationRepository.findForRecipient(id, recipientId);
      if (!existing) return Result.failure(ErrorCatalog.NOTIFICATION_NOT_FOUND);
      let current = existing;
      if (hasRead) {
        const updated = await this.notificationRepository.markRead(
          id,
          recipientId,
          command.read ? new Date().toISOString() : null
        );
        if (!updated) return Result.failure(ErrorCatalog.NOTIFICATION_NOT_FOUND);
        current = updated;
      }
      if (hasArchive) {
        const archived = await this.notificationRepository.setArchived(
          id,
          recipientId,
          command.archived ? new Date().toISOString() : null
        );
        if (!archived) return Result.failure(ErrorCatalog.NOTIFICATION_NOT_FOUND);
        current = archived;
      }
      return Result.success(current);
    } catch (error) {
      logUnexpectedError('UpdateNotificationUseCase', error);
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
