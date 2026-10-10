import type { AnalyticsOwnerDailyRecord } from '@api/domain/repositories/IAnalyticsOwnerDailyRepository';
import type { InquirySourceRow } from '@api/domain/repositories/IInquiryRepository';

export type OwnerLinkAnalyticsDto = {
  funnel: {
    previewViews: number;
    petTaps: number;
    inquiries: number;
  };
  byLink: Array<{
    linkId: string | null;
    previewViews: number;
    petTaps: number;
    inquiries: number;
  }>;
  previewViewsByDay: Array<{ day: string; previewViews: number }>;
  inquiriesByDay: Array<{ day: string; inquiries: number }>;
};

type LinkTotals = {
  previewViews: number;
  petTaps: number;
  inquiries: number;
};

/** Aggregates owner daily rows and foster-me inquiries. A null link id is the untagged row. */
export function buildOwnerLinkAnalytics(
  daily: AnalyticsOwnerDailyRecord[],
  inquiries: InquirySourceRow[]
): OwnerLinkAnalyticsDto {
  let previewViews = 0;
  let petTaps = 0;
  const byLink = new Map<string, LinkTotals>();
  const viewsByDay = new Map<string, number>();

  const bucket = (linkId: string | null): LinkTotals => {
    const key = linkId ?? '';
    const existing = byLink.get(key);
    if (existing) return existing;
    const created: LinkTotals = { previewViews: 0, petTaps: 0, inquiries: 0 };
    byLink.set(key, created);
    return created;
  };

  for (const row of daily) {
    previewViews += row.views;
    petTaps += row.petTaps;
    const totals = bucket(row.linkId);
    totals.previewViews += row.views;
    totals.petTaps += row.petTaps;
    viewsByDay.set(row.day, (viewsByDay.get(row.day) ?? 0) + row.views);
  }

  const inquiriesByDay = new Map<string, number>();
  for (const inquiry of inquiries) {
    const totals = bucket(inquiry.sourceLinkId);
    totals.inquiries += 1;
    const day = inquiry.createdAt.slice(0, 10);
    inquiriesByDay.set(day, (inquiriesByDay.get(day) ?? 0) + 1);
  }

  return {
    funnel: {
      previewViews,
      petTaps,
      inquiries: inquiries.length,
    },
    byLink: [...byLink.entries()]
      .map(([key, totals]) => ({
        linkId: key || null,
        previewViews: totals.previewViews,
        petTaps: totals.petTaps,
        inquiries: totals.inquiries,
      }))
      .sort(
        (a, b) =>
          b.previewViews - a.previewViews ||
          (a.linkId ?? '\uffff').localeCompare(b.linkId ?? '\uffff')
      ),
    previewViewsByDay: [...viewsByDay.entries()]
      .map(([day, views]) => ({ day, previewViews: views }))
      .sort((a, b) => a.day.localeCompare(b.day)),
    inquiriesByDay: [...inquiriesByDay.entries()]
      .map(([day, count]) => ({ day, inquiries: count }))
      .sort((a, b) => a.day.localeCompare(b.day)),
  };
}
