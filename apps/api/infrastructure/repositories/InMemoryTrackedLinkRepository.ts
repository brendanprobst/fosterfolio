import { randomUUID } from 'crypto';
import type {
  ChannelPair,
  CreateTrackedLinkInput,
  ITrackedLinkRepository,
  TrackedLinkRecord,
  UpdateTrackedLinkInput,
} from '@api/domain/repositories/ITrackedLinkRepository';

export class InMemoryTrackedLinkRepository implements ITrackedLinkRepository {
  readonly records: TrackedLinkRecord[] = [];

  async create(input: CreateTrackedLinkInput): Promise<TrackedLinkRecord> {
    if (this.records.some((row) => row.code === input.code)) {
      throw new Error('tracked link code already exists');
    }
    const record: TrackedLinkRecord = {
      id: randomUUID(),
      petId: input.petId,
      ownerId: input.ownerId,
      code: input.code,
      channelKey: input.channelKey,
      channelName: input.channelName,
      label: input.label,
      archivedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.records.push(record);
    return record;
  }

  async listByPetId(petId: string): Promise<TrackedLinkRecord[]> {
    return this.records
      .filter((row) => row.petId === petId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async findById(id: string): Promise<TrackedLinkRecord | null> {
    return this.records.find((row) => row.id === id) ?? null;
  }

  async findByCode(code: string): Promise<TrackedLinkRecord | null> {
    return this.records.find((row) => row.code === code) ?? null;
  }

  async update(id: string, input: UpdateTrackedLinkInput): Promise<TrackedLinkRecord> {
    const row = this.records.find((item) => item.id === id);
    if (!row) {
      throw new Error('tracked link not found');
    }
    if (input.channelKey !== undefined) row.channelKey = input.channelKey;
    if (input.channelName !== undefined) row.channelName = input.channelName;
    if (input.label !== undefined) row.label = input.label;
    if (input.archivedAt !== undefined) row.archivedAt = input.archivedAt;
    return row;
  }

  async listChannelPairsByOwner(ownerId: string): Promise<ChannelPair[]> {
    return this.records
      .filter((row) => row.ownerId === ownerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((row) => ({ channelKey: row.channelKey, channelName: row.channelName }));
  }
}
