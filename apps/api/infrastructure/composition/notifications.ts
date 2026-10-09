import { GetNotificationPreferencesUseCase, PutNotificationPreferenceUseCase } from '@api/application/use-cases/NotificationPreferencesUseCases';
import { GetUnreadNotificationCountUseCase } from '@api/application/use-cases/GetUnreadNotificationCountUseCase';
import { ListNotificationsUseCase } from '@api/application/use-cases/ListNotificationsUseCase';
import { UpdateNotificationUseCase } from '@api/application/use-cases/UpdateNotificationUseCase';
import { ensureInquiryReceivedRegistered } from '@api/application/notifications/inquiryReceived';
import type { IInquiryRepository } from '@api/domain/repositories/IInquiryRepository';
import type { INotificationRepository } from '@api/domain/repositories/INotificationRepository';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { ITrackedLinkRepository } from '@api/domain/repositories/ITrackedLinkRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import { InMemoryNotificationRepository } from '@api/infrastructure/repositories/InMemoryNotificationRepository';
import { NotificationRepository } from '@api/infrastructure/repositories/NotificationRepository';

export type NotificationsModule = {
  notificationRepository: INotificationRepository;
  getListNotificationsUseCase: () => ListNotificationsUseCase;
  getUnreadNotificationCountUseCase: () => GetUnreadNotificationCountUseCase;
  getUpdateNotificationUseCase: () => UpdateNotificationUseCase;
  getNotificationPreferencesUseCase: () => GetNotificationPreferencesUseCase;
  getPutNotificationPreferenceUseCase: () => PutNotificationPreferenceUseCase;
};

export function createNotificationRepository(dataAdapter: DataAdapter | null): INotificationRepository {
  return dataAdapter ? new NotificationRepository(dataAdapter) : new InMemoryNotificationRepository();
}

export function createNotificationsModule(
  notificationRepository: INotificationRepository,
  inquiryRepository: IInquiryRepository,
  petRepository: IPetRepository,
  trackedLinkRepository: ITrackedLinkRepository
): NotificationsModule {
  ensureInquiryReceivedRegistered();

  return {
    notificationRepository,
    getListNotificationsUseCase: () =>
      new ListNotificationsUseCase(
        notificationRepository,
        inquiryRepository,
        petRepository,
        trackedLinkRepository
      ),
    getUnreadNotificationCountUseCase: () =>
      new GetUnreadNotificationCountUseCase(notificationRepository),
    getUpdateNotificationUseCase: () => new UpdateNotificationUseCase(notificationRepository),
    getNotificationPreferencesUseCase: () =>
      new GetNotificationPreferencesUseCase(notificationRepository),
    getPutNotificationPreferenceUseCase: () =>
      new PutNotificationPreferenceUseCase(notificationRepository),
  };
}
