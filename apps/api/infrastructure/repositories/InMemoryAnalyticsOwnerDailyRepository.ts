import type {
  AnalyticsOwnerDailyRecord,
  AnalyticsOwnerDailyWrite,
  IAnalyticsOwnerDailyRepository,
} from '@api/domain/repositories/IAnalyticsOwnerDailyRepository';
import { analyticsOwnerDailyKey } from '@api/infrastructure/analytics/analyticsOwnerDailyKey';

export class InMemoryAnalyticsOwnerDailyRepository implements IAnalyticsOwnerDailyRepository {
  readonly records: AnalyticsOwnerDailyRecord[] = [];

  async listByOwnerId(
    ownerId: string,
    sinceDay: string | null
  ): Promise<AnalyticsOwnerDailyRecord[]> {
    return this.records
      .filter((row) => row.ownerId === ownerId && (sinceDay == null || row.day >= sinceDay))
      .sort((a, b) => a.day.localeCompare(b.day));
  }

  seed(row: AnalyticsOwnerDailyRecord): void {
    this.records.push({ ...row });
  }

  async upsert(rows: AnalyticsOwnerDailyWrite[]): Promise<void> {
    for (const row of rows) {
      const key = analyticsOwnerDailyKey(row);
      const index = this.records.findIndex((existing) => analyticsOwnerDailyKey(existing) === key);
      if (index >= 0) {
        this.records[index] = { ...row };
      } else {
        this.records.push({ ...row });
      }
    }
  }
}
