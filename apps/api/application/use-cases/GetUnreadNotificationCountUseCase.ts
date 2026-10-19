import type { INotificationRepository } from '@api/domain/repositories/INotificationRepository';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';

export class GetUnreadNotificationCountUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(recipientId: string): Promise<Result<{ count: number }>> {
    try {
      const count = await this.notificationRepository.countUnread(recipientId);
      return Result.success({ count });
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
