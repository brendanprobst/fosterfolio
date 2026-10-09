/** Same coalesced key as analytics_daily and @lattice/analytics aggregateKey. */
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
