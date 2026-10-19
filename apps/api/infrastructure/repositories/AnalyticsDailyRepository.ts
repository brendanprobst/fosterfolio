import type {
  AnalyticsDailyRecord,
  AnalyticsDailyWrite,
  IAnalyticsDailyRepository,
} from '@api/domain/repositories/IAnalyticsDailyRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import {
  addAnalyticsDailyRows,
  analyticsDailyKey,
} from '@api/infrastructure/analytics/analyticsDailyKey';
import { sumRowsByKey } from '@api/infrastructure/analytics/sumRowsByKey';

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

/** Columns of the analytics_daily_uniq index (unique nulls not distinct). */
const ON_CONFLICT = 'pet_id,link_id,channel_key,city,day';

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

export class AnalyticsDailyRepository implements IAnalyticsDailyRepository {
  private readonly table: string;

  constructor(private readonly dataAdapter: DataAdapter) {
    this.table = process.env.SUPABASE_ANALYTICS_DAILY_TABLE?.trim() || 'analytics_daily';
  }

  /** One statement, so the batch is written all or nothing. */
  async upsert(rows: AnalyticsDailyWrite[]): Promise<void> {
    if (rows.length === 0) return;
    const updatedAt = new Date().toISOString();
    const body = sumRowsByKey(rows, analyticsDailyKey, addAnalyticsDailyRows).map((row) => ({
      pet_id: row.petId,
      link_id: row.linkId,
      channel_key: row.channelKey,
      city: row.city,
      day: row.day,
      views: row.views,
      approx_visitors: row.approxVisitors,
      form_opens: row.formOpens,
      updated_at: updatedAt,
    }));
    await this.dataAdapter.post(`${this.table}?on_conflict=${ON_CONFLICT}`, body, {
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    });
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
    const rows = await this.dataAdapter.rpc<Array<{ link_id: string; views: number | string }>>(
      'analytics_link_view_totals',
      { p_link_ids: linkIds }
    );
    for (const row of rows) {
      totals.set(row.link_id, Number(row.views));
    }
    return totals;
  }
}
