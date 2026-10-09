import type {
  InAppChannel,
  NewNotification,
  NotificationPreferenceStore,
  NotificationRecord,
} from '@lattice/notifications';

export type NotificationStatus = 'unread' | 'all' | 'archived';

export type NotificationCursor = {
  createdAt: string;
  id: string;
};

export type NotificationPage = {
  items: NotificationRecord[];
  nextCursor: NotificationCursor | null;
};

export type NotificationPreferenceRecord = {
  userId: string;
  type: string;
  emailEnabled: boolean;
};

export interface INotificationRepository extends InAppChannel, NotificationPreferenceStore {
  insert(input: NewNotification): Promise<NotificationRecord>;
  markEmailed(id: string, emailedAt: string): Promise<NotificationRecord>;
  getEmailEnabled(recipientId: string, type: string): Promise<boolean | null>;
  listForRecipient(
    recipientId: string,
    status: NotificationStatus,
    limit: number,
    cursor: NotificationCursor | null
  ): Promise<NotificationPage>;
  countUnread(recipientId: string): Promise<number>;
  findForRecipient(id: string, recipientId: string): Promise<NotificationRecord | null>;
  markRead(id: string, recipientId: string, readAt: string): Promise<NotificationRecord | null>;
  setArchived(
    id: string,
    recipientId: string,
    archivedAt: string | null
  ): Promise<NotificationRecord | null>;
  listPreferences(userId: string): Promise<NotificationPreferenceRecord[]>;
  upsertPreference(
    userId: string,
    type: string,
    emailEnabled: boolean
  ): Promise<NotificationPreferenceRecord>;
}
