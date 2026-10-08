import type {
  ChannelPair,
  CreateTrackedLinkInput,
  ITrackedLinkRepository,
  TrackedLinkRecord,
  UpdateTrackedLinkInput,
} from '@api/domain/repositories/ITrackedLinkRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';

type TrackedLinkRow = {
  id: string;
  pet_id: string;
  owner_id: string;
  code: string;
  channel_key: string;
  channel_name: string;
  label: string | null;
  archived_at: string | null;
  created_at: string;
};

const SELECT =
  'id,pet_id,owner_id,code,channel_key,channel_name,label,archived_at,created_at';

function toRecord(row: TrackedLinkRow): TrackedLinkRecord {
  return {
    id: row.id,
    petId: row.pet_id,
    ownerId: row.owner_id,
    code: row.code,
    channelKey: row.channel_key,
    channelName: row.channel_name,
    label: row.label,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

export class TrackedLinkRepository implements ITrackedLinkRepository {
  private readonly table: string;

  constructor(private readonly dataAdapter: DataAdapter) {
    this.table = process.env.SUPABASE_TRACKED_LINKS_TABLE?.trim() || 'tracked_links';
  }

  async create(input: CreateTrackedLinkInput): Promise<TrackedLinkRecord> {
    const rows = await this.dataAdapter.insertReturning<TrackedLinkRow[]>(this.table, [
      {
        pet_id: input.petId,
        owner_id: input.ownerId,
        code: input.code,
        channel_key: input.channelKey,
        channel_name: input.channelName,
        label: input.label,
      },
    ]);
    const row = rows[0];
    if (!row) {
      throw new Error('Tracked link insert returned no row');
    }
    return toRecord(row);
  }

  async listByPetId(petId: string): Promise<TrackedLinkRecord[]> {
    const rows = await this.dataAdapter.get<TrackedLinkRow[]>(
      `${this.table}?select=${SELECT}&pet_id=eq.${encodeURIComponent(petId)}&order=created_at.asc`
    );
    return rows.map(toRecord);
  }

  async findById(id: string): Promise<TrackedLinkRecord | null> {
    const rows = await this.dataAdapter.get<TrackedLinkRow[]>(
      `${this.table}?select=${SELECT}&id=eq.${encodeURIComponent(id)}&limit=1`
    );
    const row = rows[0];
    return row ? toRecord(row) : null;
  }

  async findByCode(code: string): Promise<TrackedLinkRecord | null> {
    const rows = await this.dataAdapter.get<TrackedLinkRow[]>(
      `${this.table}?select=${SELECT}&code=eq.${encodeURIComponent(code)}&limit=1`
    );
    const row = rows[0];
    return row ? toRecord(row) : null;
  }

  async update(id: string, input: UpdateTrackedLinkInput): Promise<TrackedLinkRecord> {
    const body: Record<string, unknown> = {};
    if (input.channelKey !== undefined) body.channel_key = input.channelKey;
    if (input.channelName !== undefined) body.channel_name = input.channelName;
    if (input.label !== undefined) body.label = input.label;
    if (input.archivedAt !== undefined) body.archived_at = input.archivedAt;

    const rows = await this.dataAdapter.update<TrackedLinkRow[]>(
      `${this.table}?id=eq.${encodeURIComponent(id)}`,
      body,
      { headers: { Prefer: 'return=representation' } }
    );
    const row = rows[0];
    if (!row) {
      throw new Error('Tracked link update returned no row');
    }
    return toRecord(row);
  }

  async listChannelPairsByOwner(ownerId: string): Promise<ChannelPair[]> {
    const rows = await this.dataAdapter.get<
      Pick<TrackedLinkRow, 'channel_key' | 'channel_name'>[]
    >(
      `${this.table}?select=channel_key,channel_name&owner_id=eq.${encodeURIComponent(ownerId)}&order=created_at.asc`
    );
    return rows.map((row) => ({
      channelKey: row.channel_key,
      channelName: row.channel_name,
    }));
  }
}
