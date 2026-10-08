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

/** View and inquiry totals stay 0 until the rollup slice reads analytics_daily. */
export function toTrackedLinkDto(record: TrackedLinkRecord): TrackedLinkDto {
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
    views: 0,
    inquiries: 0,
  };
}

export function normalizeTrackedLinkLabel(label: string | null | undefined): string | null {
  if (label == null) return null;
  const trimmed = label.trim();
  return trimmed ? trimmed : null;
}
