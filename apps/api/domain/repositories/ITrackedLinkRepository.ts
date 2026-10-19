import type { TrackedLinkTarget } from '@api/domain/entities/TrackedLink';

export type TrackedLinkRecord = {
  id: string;
  target: TrackedLinkTarget;
  petId: string | null;
  ownerId: string;
  code: string;
  channelKey: string;
  channelName: string;
  label: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type CreateTrackedLinkInput = {
  target: TrackedLinkTarget;
  petId: string | null;
  ownerId: string;
  code: string;
  channelKey: string;
  channelName: string;
  label: string | null;
};

export type UpdateTrackedLinkInput = {
  channelKey?: string;
  channelName?: string;
  label?: string | null;
  archivedAt?: string | null;
};

export type ChannelPair = {
  channelKey: string;
  channelName: string;
};

export interface ITrackedLinkRepository {
  create(input: CreateTrackedLinkInput): Promise<TrackedLinkRecord>;
  listByPetId(petId: string): Promise<TrackedLinkRecord[]>;
  /** Every link this owner has, both targets, archived included. */
  listByOwnerId(ownerId: string): Promise<TrackedLinkRecord[]>;
  /** Every link for any of these owners, both targets, archived included. */
  listByOwnerIds(ownerIds: string[]): Promise<TrackedLinkRecord[]>;
  /** Active foster-me link whose channel is the reserved default, if any. */
  findActiveDefaultByOwner(ownerId: string): Promise<TrackedLinkRecord | null>;
  findById(id: string): Promise<TrackedLinkRecord | null>;
  findByCode(code: string): Promise<TrackedLinkRecord | null>;
  update(id: string, input: UpdateTrackedLinkInput): Promise<TrackedLinkRecord>;
  /** Every link for this owner, including archived. Preset rows may be included. */
  listChannelPairsByOwner(ownerId: string): Promise<ChannelPair[]>;
}
