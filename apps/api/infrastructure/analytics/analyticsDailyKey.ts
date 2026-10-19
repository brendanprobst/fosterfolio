import type { AnalyticsDailyWrite } from '@api/domain/repositories/IAnalyticsDailyRepository';

/**
 * Same key as analytics_daily_uniq (nulls not distinct) and @lattice/analytics aggregateKey.
 * A null city and '' give the same string here; stored rows never carry ''.
 */
const NULL_LINK_ID = '00000000-0000-0000-0000-000000000000';

export function analyticsDailyKey(row: {
  petId: string;
  linkId: string | null;
  channelKey: string;
  city: string | null;
  day: string;
}): string {
  return [row.petId, row.linkId ?? NULL_LINK_ID, row.channelKey, row.city ?? '', row.day].join(
    '\u0000'
  );
}

/** Adds the counts of two rows with the same key. */
export function addAnalyticsDailyRows(
  a: AnalyticsDailyWrite,
  b: AnalyticsDailyWrite
): AnalyticsDailyWrite {
  return {
    ...a,
    views: a.views + b.views,
    approxVisitors: a.approxVisitors + b.approxVisitors,
    formOpens: a.formOpens + b.formOpens,
  };
}
