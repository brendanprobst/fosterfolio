import type {
  AnalyticsDailyRecord,
  AnalyticsDailyWrite,
  IAnalyticsDailyRepository,
} from '@api/domain/repositories/IAnalyticsDailyRepository';
import { analyticsDailyKey } from '@api/infrastructure/analytics/analyticsDailyKey';

export class InMemoryAnalyticsDailyRepository implements IAnalyticsDailyRepository {
  readonly records: AnalyticsDailyRecord[] = [];

  async upsert(rows: AnalyticsDailyWrite[]): Promise<void> {
    for (const row of rows) {
      const key = analyticsDailyKey(row);
      const index = this.records.findIndex((existing) => analyticsDailyKey(existing) === key);
      if (index >= 0) {
        this.records[index] = { ...row };
      } else {
        this.records.push({ ...row });
      }
    }
  }

  async listByPetId(petId: string, sinceDay: string | null): Promise<AnalyticsDailyRecord[]> {
    return this.records
      .filter((row) => row.petId === petId && (sinceDay == null || row.day >= sinceDay))
      .sort((a, b) => a.day.localeCompare(b.day));
  }

  async sumViewsByLinkIds(linkIds: string[]): Promise<Map<string, number>> {
    const wanted = new Set(linkIds);
    const totals = new Map<string, number>();
    for (const row of this.records) {
      if (!row.linkId || !wanted.has(row.linkId)) continue;
      totals.set(row.linkId, (totals.get(row.linkId) ?? 0) + row.views);
    }
    return totals;
  }

  seed(row: AnalyticsDailyRecord): void {
    this.records.push({ ...row });
  }
}
