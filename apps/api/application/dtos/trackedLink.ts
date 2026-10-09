import type { TrackedLinkRecord } from '@api/domain/repositories/ITrackedLinkRepository';

export type TrackedLinkDto = {
  id: string;
  petId: string;
  ownerId: string;
  code: string;
  channelKey: string;
  channelName: string;
  label: string | null;
  archivedAt: string | null;
  createdAt: string;
  views: number;
  inquiries: number;
};

export type ResolvedTrackedLinkDto = {
  linkId: string;
  channelKey: string;
  petId: string;
};

export type ChannelOptionDto = {
  key: string;
  name: string;
  isPreset: boolean;
};

export type TrackedLinkTotals = {
  views: number;
  inquiries: number;
};

/** Create and patch omit totals, so a brand-new link still returns zeros. */
export function toTrackedLinkDto(
  record: TrackedLinkRecord,
  totals: TrackedLinkTotals = { views: 0, inquiries: 0 }
): TrackedLinkDto {
  return {
    id: record.id,
    petId: record.petId,
    ownerId: record.ownerId,
    code: record.code,
    channelKey: record.channelKey,
    channelName: record.channelName,
    label: record.label,
    archivedAt: record.archivedAt,
    createdAt: record.createdAt,
    views: totals.views,
    inquiries: totals.inquiries,
  };
}

export function normalizeTrackedLinkLabel(label: string | null | undefined): string | null {
  if (label == null) return null;
  const trimmed = label.trim();
  return trimmed ? trimmed : null;
}
