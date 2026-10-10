import type {
  INotificationRepository,
  NotificationCursor,
  NotificationPage,
  NotificationPreferenceRecord,
  NotificationStatus,
} from '@api/domain/repositories/INotificationRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import type { NewNotification, NotificationRecord } from '@lattice/notifications';

type NotificationRow = {
  id: string;
  recipient_id: string;
  type: string;
  payload: Record<string, unknown> | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  archived_at: string | null;
  emailed_at: string | null;
  created_at: string;
};

type PreferenceRow = {
  user_id: string;
  type: string;
  email_enabled: boolean;
};

const SELECT =
  'id,recipient_id,type,payload,entity_type,entity_id,read_at,archived_at,emailed_at,created_at';

function toRecord(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    type: row.type,
    payload: row.payload ?? {},
    entityType: row.entity_type,
    entityId: row.entity_id,
    readAt: row.read_at,
    archivedAt: row.archived_at,
    emailedAt: row.emailed_at,
    createdAt: row.created_at,
  };
}

function statusFilter(status: NotificationStatus): string {
  if (status === 'unread') return '&read_at=is.null&archived_at=is.null';
  if (status === 'archived') return '&archived_at=not.is.null';
  return '&archived_at=is.null';
}

/**
 * Service-role writes. Authenticated RLS on these tables is select-only.
 */
export class NotificationRepository implements INotificationRepository {
  private readonly table: string;
  private readonly preferencesTable: string;

  constructor(private readonly dataAdapter: DataAdapter) {
    this.table = process.env.SUPABASE_NOTIFICATIONS_TABLE?.trim() || 'notifications';
    this.preferencesTable =
      process.env.SUPABASE_NOTIFICATION_PREFERENCES_TABLE?.trim() || 'notification_preferences';
  }

  async insert(input: NewNotification): Promise<NotificationRecord> {
    const rows = await this.dataAdapter.insertReturning<NotificationRow[]>(this.table, [
      {
        recipient_id: input.recipientId,
        type: input.type,
        payload: input.payload,
        entity_type: input.entityType,
        entity_id: input.entityId,
      },
    ]);
    const row = rows[0];
    if (!row) throw new Error('Notification insert returned no row');
    return toRecord(row);
  }

  async markEmailed(id: string, emailedAt: string): Promise<NotificationRecord> {
    const rows = await this.dataAdapter.update<NotificationRow[]>(
      `${this.table}?id=eq.${encodeURIComponent(id)}`,
      { emailed_at: emailedAt },
      { headers: { Prefer: 'return=representation' } }
    );
    const row = rows[0];
    if (!row) throw new Error('Notification email stamp returned no row');
    return toRecord(row);
  }

  async getEmailEnabled(recipientId: string, type: string): Promise<boolean | null> {
    const rows = await this.dataAdapter.get<PreferenceRow[]>(
      `${this.preferencesTable}?select=email_enabled&user_id=eq.${encodeURIComponent(recipientId)}&type=eq.${encodeURIComponent(type)}&limit=1`
    );
    const row = rows[0];
    return row ? row.email_enabled : null;
  }

  async listForRecipient(
    recipientId: string,
    status: NotificationStatus,
    limit: number,
    cursor: NotificationCursor | null
  ): Promise<NotificationPage> {
    const cursorFilter = cursor
      ? `&or=(created_at.lt.${encodeURIComponent(cursor.createdAt)},and(created_at.eq.${encodeURIComponent(cursor.createdAt)},id.lt.${encodeURIComponent(cursor.id)}))`
      : '';
    const rows = await this.dataAdapter.get<NotificationRow[]>(
      `${this.table}?select=${SELECT}&recipient_id=eq.${encodeURIComponent(recipientId)}${statusFilter(status)}${cursorFilter}&order=created_at.desc,id.desc&limit=${limit + 1}`
    );
    const page = rows.slice(0, limit).map(toRecord);
    const last = page[page.length - 1];
    const nextCursor =
      rows.length > limit && last ? { createdAt: last.createdAt, id: last.id } : null;
    return { items: page, nextCursor };
  }

  async countUnread(recipientId: string): Promise<number> {
    const result = await this.dataAdapter.getWithCount<NotificationRow[]>(
      `${this.table}?select=id&recipient_id=eq.${encodeURIComponent(recipientId)}&read_at=is.null&archived_at=is.null&limit=1`
    );
    return result.count ?? result.data.length;
  }

  async findForRecipient(id: string, recipientId: string): Promise<NotificationRecord | null> {
    const rows = await this.dataAdapter.get<NotificationRow[]>(
      `${this.table}?select=${SELECT}&id=eq.${encodeURIComponent(id)}&recipient_id=eq.${encodeURIComponent(recipientId)}&limit=1`
    );
    const row = rows[0];
    return row ? toRecord(row) : null;
  }

  async markRead(
    id: string,
    recipientId: string,
    readAt: string | null
  ): Promise<NotificationRecord | null> {
    const existing = await this.findForRecipient(id, recipientId);
    if (!existing) return null;
    if (readAt !== null && existing.readAt) return existing;
    const rows = await this.dataAdapter.update<NotificationRow[]>(
      `${this.table}?id=eq.${encodeURIComponent(id)}&recipient_id=eq.${encodeURIComponent(recipientId)}`,
      { read_at: readAt },
      { headers: { Prefer: 'return=representation' } }
    );
    const row = rows[0];
    return row ? toRecord(row) : existing;
  }

  async setArchived(
    id: string,
    recipientId: string,
    archivedAt: string | null
  ): Promise<NotificationRecord | null> {
    const rows = await this.dataAdapter.update<NotificationRow[]>(
      `${this.table}?id=eq.${encodeURIComponent(id)}&recipient_id=eq.${encodeURIComponent(recipientId)}`,
      { archived_at: archivedAt },
      { headers: { Prefer: 'return=representation' } }
    );
    const row = rows[0];
    return row ? toRecord(row) : null;
  }

  async listPreferences(userId: string): Promise<NotificationPreferenceRecord[]> {
    const rows = await this.dataAdapter.get<PreferenceRow[]>(
      `${this.preferencesTable}?select=user_id,type,email_enabled&user_id=eq.${encodeURIComponent(userId)}`
    );
    return rows.map((row) => ({
      userId: row.user_id,
      type: row.type,
      emailEnabled: row.email_enabled,
    }));
  }

  async upsertPreference(
    userId: string,
    type: string,
    emailEnabled: boolean
  ): Promise<NotificationPreferenceRecord> {
    const rows = await this.dataAdapter.post<PreferenceRow[]>(
      `${this.preferencesTable}?on_conflict=user_id,type`,
      [{ user_id: userId, type, email_enabled: emailEnabled }],
      { headers: { Prefer: 'resolution=merge-duplicates,return=representation' } }
    );
    const row = rows[0];
    if (!row) throw new Error('Preference upsert returned no row');
    return { userId: row.user_id, type: row.type, emailEnabled: row.email_enabled };
  }
}
