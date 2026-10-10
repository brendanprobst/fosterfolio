import type {
  AnalyticsOwnerDailyRecord,
  AnalyticsOwnerDailyWrite,
  IAnalyticsOwnerDailyRepository,
} from '@api/domain/repositories/IAnalyticsOwnerDailyRepository';
import { analyticsOwnerDailyKey } from '@api/infrastructure/analytics/analyticsOwnerDailyKey';

export class InMemoryAnalyticsOwnerDailyRepository implements IAnalyticsOwnerDailyRepository {
  readonly records: AnalyticsOwnerDailyRecord[] = [];

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
