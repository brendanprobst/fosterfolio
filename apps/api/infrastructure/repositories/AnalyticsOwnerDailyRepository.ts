import type {
  AnalyticsOwnerDailyRecord,
  AnalyticsOwnerDailyWrite,
  IAnalyticsOwnerDailyRepository,
} from '@api/domain/repositories/IAnalyticsOwnerDailyRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import { eqValue, inList } from '@api/infrastructure/adapters/dataAdapter/postgrestFilters';
import { analyticsOwnerDailyKey } from '@api/infrastructure/analytics/analyticsOwnerDailyKey';

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

function isUniqueViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('23505') || message.includes('duplicate') || message.includes('(409)');
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

  async upsert(rows: AnalyticsOwnerDailyWrite[]): Promise<void> {
    if (rows.length === 0) return;
    const ownerIds = [...new Set(rows.map((row) => row.ownerId))];
    const days = rows.map((row) => row.day).sort();
    const start = days[0];
    const end = days[days.length - 1];
    if (!start || !end) return;

    const existing = await this.dataAdapter.get<AnalyticsOwnerDailyRow[]>(
      `${this.table}?select=${SELECT}&owner_id=in.${inList(ownerIds)}&day=gte.${eqValue(start)}&day=lte.${eqValue(end)}&limit=10000`
    );
    const keys = new Set(existing.map((row) => analyticsOwnerDailyKey(toRecord(row))));

    for (const row of rows) {
      const key = analyticsOwnerDailyKey(row);
      if (keys.has(key)) {
        await this.patch(row);
        continue;
      }
      try {
        await this.dataAdapter.insertReturning(
          this.table,
          [
            {
              owner_id: row.ownerId,
              link_id: row.linkId,
              channel_key: row.channelKey,
              city: row.city,
              day: row.day,
              views: row.views,
              approx_visitors: row.approxVisitors,
              pet_taps: row.petTaps,
              updated_at: new Date().toISOString(),
            },
          ],
          { headers: { Prefer: 'return=minimal' } }
        );
        keys.add(key);
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        await this.patch(row);
        keys.add(key);
      }
    }
  }

  private async patch(row: AnalyticsOwnerDailyWrite): Promise<void> {
    const linkFilter = row.linkId ? `link_id=eq.${eqValue(row.linkId)}` : 'link_id=is.null';
    const cityFilter = row.city ? `city=eq.${eqValue(row.city)}` : 'city=is.null';
    await this.dataAdapter.update(
      `${this.table}?owner_id=eq.${eqValue(row.ownerId)}&${linkFilter}&channel_key=eq.${eqValue(row.channelKey)}&${cityFilter}&day=eq.${eqValue(row.day)}`,
      {
        views: row.views,
        approx_visitors: row.approxVisitors,
        pet_taps: row.petTaps,
        updated_at: new Date().toISOString(),
      },
      { headers: { Prefer: 'return=minimal' } }
    );
  }
}
