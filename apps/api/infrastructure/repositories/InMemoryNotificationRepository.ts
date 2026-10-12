import { randomUUID } from 'crypto';
import type {
  INotificationRepository,
  NotificationCursor,
  NotificationFilters,
  NotificationPage,
  NotificationPreferenceRecord,
  NotificationStatus,
} from '@api/domain/repositories/INotificationRepository';
import type { NewNotification, NotificationRecord } from '@lattice/notifications';

function isUnread(row: NotificationRecord): boolean {
  return row.readAt == null && row.archivedAt == null;
}

function matchesStatus(row: NotificationRecord, status: NotificationStatus): boolean {
  if (status === 'unread') return isUnread(row);
  if (status === 'archived') return row.archivedAt != null;
  return row.archivedAt == null;
}

function compareDesc(a: NotificationRecord, b: NotificationRecord): number {
  const byTime = b.createdAt.localeCompare(a.createdAt);
  if (byTime !== 0) return byTime;
  return b.id.localeCompare(a.id);
}

function afterCursor(row: NotificationRecord, cursor: NotificationCursor): boolean {
  if (row.createdAt < cursor.createdAt) return true;
  if (row.createdAt > cursor.createdAt) return false;
  return row.id < cursor.id;
}

export class InMemoryNotificationRepository implements INotificationRepository {
  readonly records: NotificationRecord[] = [];
  readonly preferences: NotificationPreferenceRecord[] = [];

  async insert(input: NewNotification): Promise<NotificationRecord> {
    const row: NotificationRecord = {
      id: randomUUID(),
      recipientId: input.recipientId,
      type: input.type,
      payload: input.payload,
      entityType: input.entityType,
      entityId: input.entityId,
      readAt: null,
      archivedAt: null,
      emailedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.records.push(row);
    return row;
  }

  async markEmailed(id: string, emailedAt: string): Promise<NotificationRecord> {
    const row = this.records.find((item) => item.id === id);
    if (!row) throw new Error('notification not found');
    row.emailedAt = emailedAt;
    return row;
  }

  async getEmailEnabled(recipientId: string, type: string): Promise<boolean | null> {
    const row = this.preferences.find(
      (item) => item.userId === recipientId && item.type === type
    );
    return row ? row.emailEnabled : null;
  }

  async listForRecipient(
    recipientId: string,
    status: NotificationStatus,
    limit: number,
    cursor: NotificationCursor | null,
    filters: NotificationFilters = {}
  ): Promise<NotificationPage> {
    const rows = this.records
      .filter((row) => row.recipientId === recipientId && matchesStatus(row, status))
      .filter((row) => (filters.petId ? row.payload.petId === filters.petId : true))
      .filter((row) => (cursor ? afterCursor(row, cursor) : true))
      .sort(compareDesc);
    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    const nextCursor =
      rows.length > limit && last ? { createdAt: last.createdAt, id: last.id } : null;
    return { items, nextCursor };
  }

  async countUnread(recipientId: string): Promise<number> {
    return this.records.filter((row) => row.recipientId === recipientId && isUnread(row)).length;
  }

  async findForRecipient(id: string, recipientId: string): Promise<NotificationRecord | null> {
    return this.records.find((row) => row.id === id && row.recipientId === recipientId) ?? null;
  }

  async markRead(
    id: string,
    recipientId: string,
    readAt: string | null
  ): Promise<NotificationRecord | null> {
    const row = await this.findForRecipient(id, recipientId);
    if (!row) return null;
    if (readAt === null) row.readAt = null;
    else if (!row.readAt) row.readAt = readAt;
    return row;
  }

  async setArchived(
    id: string,
    recipientId: string,
    archivedAt: string | null
  ): Promise<NotificationRecord | null> {
    const row = await this.findForRecipient(id, recipientId);
    if (!row) return null;
    row.archivedAt = archivedAt;
    return row;
  }

  async listPreferences(userId: string): Promise<NotificationPreferenceRecord[]> {
    return this.preferences.filter((row) => row.userId === userId);
  }

  async upsertPreference(
    userId: string,
    type: string,
    emailEnabled: boolean
  ): Promise<NotificationPreferenceRecord> {
    const existing = this.preferences.find((row) => row.userId === userId && row.type === type);
    if (existing) {
      existing.emailEnabled = emailEnabled;
      return existing;
    }
    const created = { userId, type, emailEnabled };
    this.preferences.push(created);
    return created;
  }
}
