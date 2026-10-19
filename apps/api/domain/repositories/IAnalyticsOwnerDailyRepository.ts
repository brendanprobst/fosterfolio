export type AnalyticsOwnerDailyRecord = {
  ownerId: string;
  linkId: string | null;
  channelKey: string;
  city: string | null;
  day: string;
  views: number;
  approxVisitors: number;
  petTaps: number;
};

export type AnalyticsOwnerDailyWrite = AnalyticsOwnerDailyRecord;

export interface IAnalyticsOwnerDailyRepository {
  /**
   * Overwrites matching keys, all or nothing. Rows in one call that share a key are summed first.
   * Does not delete days outside the written set.
   */
  upsert(rows: AnalyticsOwnerDailyWrite[]): Promise<void>;
  /** sinceDay is inclusive (YYYY-MM-DD). Null returns every stored day. */
  listByOwnerId(ownerId: string, sinceDay: string | null): Promise<AnalyticsOwnerDailyRecord[]>;
}
