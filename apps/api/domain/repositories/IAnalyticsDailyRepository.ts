export type AnalyticsDailyRecord = {
  petId: string;
  linkId: string | null;
  channelKey: string;
  city: string | null;
  day: string;
  views: number;
  approxVisitors: number;
  formOpens: number;
};

export type AnalyticsDailyWrite = AnalyticsDailyRecord;

export interface IAnalyticsDailyRepository {
  /** Overwrites matching keys. Does not delete days outside the written set. */
  upsert(rows: AnalyticsDailyWrite[]): Promise<void>;
  /** sinceDay is inclusive (YYYY-MM-DD). Null returns every stored day. */
  listByPetId(petId: string, sinceDay: string | null): Promise<AnalyticsDailyRecord[]>;
  /** Sum of views for each link id across every day. Missing ids are omitted. */
  sumViewsByLinkIds(linkIds: string[]): Promise<Map<string, number>>;
}
