import type {
  AnalyticsOwnerDailyRecord,
  AnalyticsOwnerDailyWrite,
  IAnalyticsOwnerDailyRepository,
} from '@api/domain/repositories/IAnalyticsOwnerDailyRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import {
  addAnalyticsOwnerDailyRows,
  analyticsOwnerDailyKey,
} from '@api/infrastructure/analytics/analyticsOwnerDailyKey';
import { sumRowsByKey } from '@api/infrastructure/analytics/sumRowsByKey';

type AnalyticsOwnerDailyRow = {
  owner_id: string;
  link_id: string | null;
  channel_key: string;
  city: string | null;
  day: string;
  views: number;
  approx_visitors: number;
  pet_taps: number;
};

const SELECT = 'owner_id,link_id,channel_key,city,day,views,approx_visitors,pet_taps';

/** Columns of the analytics_owner_daily_uniq index (unique nulls not distinct). */
const ON_CONFLICT = 'owner_id,link_id,channel_key,city,day';

function toRecord(row: AnalyticsOwnerDailyRow): AnalyticsOwnerDailyRecord {
  return {
    ownerId: row.owner_id,
    linkId: row.link_id,
    channelKey: row.channel_key,
    city: row.city,
    day: row.day.slice(0, 10),
    views: row.views,
    approxVisitors: row.approx_visitors,
    petTaps: row.pet_taps,
  };
}

export class AnalyticsOwnerDailyRepository implements IAnalyticsOwnerDailyRepository {
  private readonly table: string;

  constructor(private readonly dataAdapter: DataAdapter) {
    this.table =
      process.env.SUPABASE_ANALYTICS_OWNER_DAILY_TABLE?.trim() || 'analytics_owner_daily';
  }

  async listByOwnerId(
    ownerId: string,
    sinceDay: string | null
  ): Promise<AnalyticsOwnerDailyRecord[]> {
    const since = sinceDay ? `&day=gte.${sinceDay}` : '';
    const rows = await this.dataAdapter.get<AnalyticsOwnerDailyRow[]>(
      `${this.table}?select=${SELECT}&owner_id=eq.${encodeURIComponent(ownerId)}${since}&order=day.asc&limit=10000`
    );
    return rows.map(toRecord);
  }

  /** One statement, so the batch is written all or nothing. */
  async upsert(rows: AnalyticsOwnerDailyWrite[]): Promise<void> {
    if (rows.length === 0) return;
    const updatedAt = new Date().toISOString();
    const body = sumRowsByKey(rows, analyticsOwnerDailyKey, addAnalyticsOwnerDailyRows).map((row) => ({
      owner_id: row.ownerId,
      link_id: row.linkId,
      channel_key: row.channelKey,
      city: row.city,
      day: row.day,
      views: row.views,
      approx_visitors: row.approxVisitors,
      pet_taps: row.petTaps,
      updated_at: updatedAt,
    }));
    await this.dataAdapter.post(`${this.table}?on_conflict=${ON_CONFLICT}`, body, {
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    });
  }
}
