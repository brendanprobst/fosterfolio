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
