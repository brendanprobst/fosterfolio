import type {
  AnalyticsDailyRecord,
  AnalyticsDailyWrite,
  IAnalyticsDailyRepository,
} from '@api/domain/repositories/IAnalyticsDailyRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import { eqValue, inList } from '@api/infrastructure/adapters/dataAdapter/postgrestFilters';
import { analyticsDailyKey } from '@api/infrastructure/analytics/analyticsDailyKey';

type AnalyticsDailyRow = {
  pet_id: string;
  link_id: string | null;
  channel_key: string;
  city: string | null;
  day: string;
  views: number;
  approx_visitors: number;
  form_opens: number;
};

const SELECT =
  'pet_id,link_id,channel_key,city,day,views,approx_visitors,form_opens';

function toRecord(row: AnalyticsDailyRow): AnalyticsDailyRecord {
  return {
    petId: row.pet_id,
    linkId: row.link_id,
    channelKey: row.channel_key,
    city: row.city,
    day: row.day.slice(0, 10),
    views: row.views,
    approxVisitors: row.approx_visitors,
    formOpens: row.form_opens,
  };
}

function rowKey(row: AnalyticsDailyRecord): string {
  return analyticsDailyKey(row);
}

function isUniqueViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('23505') || message.includes('duplicate') || message.includes('(409)');
}

export class AnalyticsDailyRepository implements IAnalyticsDailyRepository {
  private readonly table: string;

  constructor(private readonly dataAdapter: DataAdapter) {
    this.table = process.env.SUPABASE_ANALYTICS_DAILY_TABLE?.trim() || 'analytics_daily';
  }

  async upsert(rows: AnalyticsDailyWrite[]): Promise<void> {
    if (rows.length === 0) return;
    const petIds = [...new Set(rows.map((row) => row.petId))];
    const days = rows.map((row) => row.day).sort();
    const start = days[0];
    const end = days[days.length - 1];
    if (!start || !end) return;

    const existing = await this.dataAdapter.get<AnalyticsDailyRow[]>(
      `${this.table}?select=${SELECT}&pet_id=in.${inList(petIds)}&day=gte.${eqValue(start)}&day=lte.${eqValue(end)}&limit=10000`
    );
    const keys = new Set(existing.map((row) => rowKey(toRecord(row))));

    for (const row of rows) {
      const key = rowKey(row);
      if (keys.has(key)) {
        await this.patch(row);
        continue;
      }
      try {
        await this.dataAdapter.insertReturning(
          this.table,
          [
            {
              pet_id: row.petId,
              link_id: row.linkId,
              channel_key: row.channelKey,
              city: row.city,
              day: row.day,
              views: row.views,
              approx_visitors: row.approxVisitors,
              form_opens: row.formOpens,
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

  async listByPetId(petId: string, sinceDay: string | null): Promise<AnalyticsDailyRecord[]> {
    const since = sinceDay ? `&day=gte.${sinceDay}` : '';
    const rows = await this.dataAdapter.get<AnalyticsDailyRow[]>(
      `${this.table}?select=${SELECT}&pet_id=eq.${encodeURIComponent(petId)}${since}&order=day.asc&limit=10000`
    );
    return rows.map(toRecord);
  }

  async sumViewsByLinkIds(linkIds: string[]): Promise<Map<string, number>> {
    const totals = new Map<string, number>();
    if (linkIds.length === 0) return totals;
    const rows = await this.dataAdapter.get<Array<{ link_id: string | null; views: number }>>(
      `${this.table}?select=link_id,views&link_id=in.${inList(linkIds)}&limit=10000`
    );
    for (const row of rows) {
      if (!row.link_id) continue;
      totals.set(row.link_id, (totals.get(row.link_id) ?? 0) + row.views);
    }
    return totals;
  }

  private async patch(row: AnalyticsDailyWrite): Promise<void> {
    const linkFilter = row.linkId ? `link_id=eq.${eqValue(row.linkId)}` : 'link_id=is.null';
    const cityFilter = row.city ? `city=eq.${eqValue(row.city)}` : 'city=is.null';
    await this.dataAdapter.update(
      `${this.table}?pet_id=eq.${eqValue(row.petId)}&${linkFilter}&channel_key=eq.${eqValue(row.channelKey)}&${cityFilter}&day=eq.${eqValue(row.day)}`,
      {
        views: row.views,
        approx_visitors: row.approxVisitors,
        form_opens: row.formOpens,
        updated_at: new Date().toISOString(),
      },
      { headers: { Prefer: 'return=minimal' } }
    );
  }
}
