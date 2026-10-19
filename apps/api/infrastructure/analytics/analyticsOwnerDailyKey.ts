import type { AnalyticsOwnerDailyWrite } from '@api/domain/repositories/IAnalyticsOwnerDailyRepository';

const NULL_LINK_ID = '00000000-0000-0000-0000-000000000000';

export function analyticsOwnerDailyKey(row: {
  ownerId: string;
  linkId: string | null;
  channelKey: string;
  city: string | null;
  day: string;
}): string {
  return [row.ownerId, row.linkId ?? NULL_LINK_ID, row.channelKey, row.city ?? '', row.day].join(
    '\u0000'
  );
}

/** Adds the counts of two rows with the same key. */
export function addAnalyticsOwnerDailyRows(
  a: AnalyticsOwnerDailyWrite,
  b: AnalyticsOwnerDailyWrite
): AnalyticsOwnerDailyWrite {
  return {
    ...a,
    views: a.views + b.views,
    approxVisitors: a.approxVisitors + b.approxVisitors,
    petTaps: a.petTaps + b.petTaps,
  };
}
