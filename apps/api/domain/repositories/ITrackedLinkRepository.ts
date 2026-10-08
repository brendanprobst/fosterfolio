export type TrackedLinkRecord = {
  id: string;
  petId: string;
  ownerId: string;
  code: string;
  channelKey: string;
  channelName: string;
  label: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type CreateTrackedLinkInput = {
  petId: string;
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
  findById(id: string): Promise<TrackedLinkRecord | null>;
  findByCode(code: string): Promise<TrackedLinkRecord | null>;
  update(id: string, input: UpdateTrackedLinkInput): Promise<TrackedLinkRecord>;
  /** Every link for this owner, including archived. Preset rows may be included. */
  listChannelPairsByOwner(ownerId: string): Promise<ChannelPair[]>;
}
