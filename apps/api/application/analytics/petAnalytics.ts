import type { AnalyticsDailyRecord } from '@api/domain/repositories/IAnalyticsDailyRepository';
import type { InquirySourceRow } from '@api/domain/repositories/IInquiryRepository';

export type AnalyticsRange = '7d' | '30d' | 'all';

export type PetAnalyticsDto = {
  funnel: {
    views: number;
    formOpens: number;
    inquiries: number;
    conversionRate: number | null;
  };
  byChannel: Array<{ channelKey: string; views: number; inquiries: number }>;
  byLink: Array<{ linkId: string; channelKey: string; views: number; inquiries: number }>;
  byCity: Array<{ city: string; views: number }>;
  viewsByDay: Array<{ day: string; views: number }>;
  inquiriesByDay: Array<{ day: string; inquiries: number }>;
};

export type PetAnalyticsSummaryDto = {
  views: number;
  inquiries: number;
  topChannel: { channelKey: string; views: number } | null;
};

export function parseAnalyticsRange(raw: string | undefined): AnalyticsRange | null {
  if (raw == null || raw === '') return '30d';
  if (raw === '7d' || raw === '30d' || raw === 'all') return raw;
  return null;
}

/** Inclusive UTC start day. 7d is today and the previous 6 days. */
export function startDayForRange(range: AnalyticsRange, now = new Date()): string | null {
  if (range === 'all') return null;
  const span = range === '7d' ? 6 : 29;
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - span);
  return day.toISOString().slice(0, 10);
}

export function sinceIsoForDay(day: string | null): string | null {
  return day ? `${day}T00:00:00.000Z` : null;
}

export function buildPetAnalytics(
  daily: AnalyticsDailyRecord[],
  inquiries: InquirySourceRow[]
): PetAnalyticsDto {
  let views = 0;
  let formOpens = 0;
  const viewsByChannel = new Map<string, number>();
  const viewsByCity = new Map<string, number>();
  const viewsByDay = new Map<string, number>();
  const viewsByLink = new Map<string, number>();
  const channelByLink = new Map<string, Map<string, number>>();

  for (const row of daily) {
    views += row.views;
    formOpens += row.formOpens;
    viewsByChannel.set(row.channelKey, (viewsByChannel.get(row.channelKey) ?? 0) + row.views);
    viewsByDay.set(row.day, (viewsByDay.get(row.day) ?? 0) + row.views);
    if (row.city) {
      viewsByCity.set(row.city, (viewsByCity.get(row.city) ?? 0) + row.views);
    }
    if (row.linkId) {
      viewsByLink.set(row.linkId, (viewsByLink.get(row.linkId) ?? 0) + row.views);
      const channels = channelByLink.get(row.linkId) ?? new Map<string, number>();
      channels.set(row.channelKey, (channels.get(row.channelKey) ?? 0) + row.views);
      channelByLink.set(row.linkId, channels);
    }
  }

  const inquiriesByChannel = new Map<string, number>();
  const inquiriesByLink = new Map<string, number>();
  const inquiriesByDay = new Map<string, number>();
  const inquiryChannelByLink = new Map<string, Map<string, number>>();
  for (const inquiry of inquiries) {
    const day = inquiry.createdAt.slice(0, 10);
    inquiriesByDay.set(day, (inquiriesByDay.get(day) ?? 0) + 1);
    if (inquiry.sourceChannelKey) {
      inquiriesByChannel.set(
        inquiry.sourceChannelKey,
        (inquiriesByChannel.get(inquiry.sourceChannelKey) ?? 0) + 1
      );
    }
    if (inquiry.sourceLinkId) {
      inquiriesByLink.set(
        inquiry.sourceLinkId,
        (inquiriesByLink.get(inquiry.sourceLinkId) ?? 0) + 1
      );
      if (inquiry.sourceChannelKey) {
        const channels =
          inquiryChannelByLink.get(inquiry.sourceLinkId) ?? new Map<string, number>();
        channels.set(
          inquiry.sourceChannelKey,
          (channels.get(inquiry.sourceChannelKey) ?? 0) + 1
        );
        inquiryChannelByLink.set(inquiry.sourceLinkId, channels);
      }
    }
  }

  const channelKeys = new Set<string>([...viewsByChannel.keys(), ...inquiriesByChannel.keys()]);
  const byChannel = [...channelKeys]
    .map((channelKey) => ({
      channelKey,
      views: viewsByChannel.get(channelKey) ?? 0,
      inquiries: inquiriesByChannel.get(channelKey) ?? 0,
    }))
    .sort((a, b) => b.views - a.views || a.channelKey.localeCompare(b.channelKey));

  const linkIds = new Set<string>([...viewsByLink.keys(), ...inquiriesByLink.keys()]);
  const byLink = [...linkIds]
    .map((linkId) => ({
      linkId,
      channelKey:
        leadingKey(channelByLink.get(linkId)) ??
        leadingKey(inquiryChannelByLink.get(linkId)) ??
        '',
      views: viewsByLink.get(linkId) ?? 0,
      inquiries: inquiriesByLink.get(linkId) ?? 0,
    }))
    .filter((row) => row.channelKey)
    .sort((a, b) => b.views - a.views || a.linkId.localeCompare(b.linkId));

  const byCity = [...viewsByCity.entries()]
    .filter(([, cityViews]) => cityViews > 0)
    .map(([city, cityViews]) => ({ city, views: cityViews }))
    .sort((a, b) => b.views - a.views || a.city.localeCompare(b.city));

  return {
    funnel: {
      views,
      formOpens,
      inquiries: inquiries.length,
      conversionRate: views === 0 ? null : inquiries.length / views,
    },
    byChannel,
    byLink,
    byCity,
    viewsByDay: [...viewsByDay.entries()]
      .map(([day, dayViews]) => ({ day, views: dayViews }))
      .sort((a, b) => a.day.localeCompare(b.day)),
    inquiriesByDay: [...inquiriesByDay.entries()]
      .map(([day, count]) => ({ day, inquiries: count }))
      .sort((a, b) => a.day.localeCompare(b.day)),
  };
}

export function buildPetAnalyticsSummary(
  daily: AnalyticsDailyRecord[],
  inquiries: InquirySourceRow[]
): PetAnalyticsSummaryDto {
  const analytics = buildPetAnalytics(daily, inquiries);
  const top = analytics.byChannel.find((row) => row.views > 0);
  return {
    views: analytics.funnel.views,
    inquiries: analytics.funnel.inquiries,
    topChannel: top ? { channelKey: top.channelKey, views: top.views } : null,
  };
}

function leadingKey(counts: Map<string, number> | undefined): string | null {
  if (!counts || counts.size === 0) return null;
  const ranked = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );
  return ranked[0]?.[0] ?? null;
}
