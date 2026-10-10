import type { TrackedLinkTarget } from '@api/domain/entities/TrackedLink';
import type { TrackedLinkRecord } from '@api/domain/repositories/ITrackedLinkRepository';

export type TrackedLinkDto = {
  id: string;
  target: TrackedLinkTarget;
  petId: string | null;
  petName?: string | null;
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
  target: TrackedLinkTarget;
  petId: string | null;
  ownerId: string;
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
  totals: TrackedLinkTotals = { views: 0, inquiries: 0 },
  petName?: string | null
): TrackedLinkDto {
  return {
    id: record.id,
    target: record.target,
    petId: record.petId,
    ...(petName !== undefined ? { petName } : {}),
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
