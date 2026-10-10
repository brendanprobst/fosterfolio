import type {
  CreateInquiryInput,
  IInquiryRepository,
  InquiryRecord,
  InquirySourceRow,
} from '@api/domain/repositories/IInquiryRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';

type InquiryRow = {
  id: string;
  target_user_id: string;
  target_pet_id: string | null;
  sender_name: string;
  sender_email: string;
  message: string;
  zip_code: string | null;
  source_link_id: string | null;
  source_channel_key: string | null;
  via_foster_me: boolean;
  self_reported_source: string | null;
  created_at: string;
};

const INQUIRY_SELECT =
  'id,target_user_id,target_pet_id,sender_name,sender_email,message,zip_code,source_link_id,source_channel_key,via_foster_me,self_reported_source,created_at';

function toRecord(row: InquiryRow): InquiryRecord {
  return {
    id: row.id,
    targetUserId: row.target_user_id,
    targetPetId: row.target_pet_id,
    senderName: row.sender_name,
    senderEmail: row.sender_email,
    message: row.message,
    zipCode: row.zip_code,
    sourceLinkId: row.source_link_id,
    sourceChannelKey: row.source_channel_key,
    viaFosterMe: row.via_foster_me === true,
    selfReportedSource: row.self_reported_source,
    createdAt: row.created_at,
  };
}

export class InquiryRepository implements IInquiryRepository {
  private readonly table: string;

  constructor(private readonly dataAdapter: DataAdapter) {
    this.table = process.env.SUPABASE_INQUIRIES_TABLE?.trim() || 'inquiries';
  }

  async create(input: CreateInquiryInput): Promise<InquiryRecord> {
    const rows = await this.dataAdapter.insertReturning<InquiryRow[]>(this.table, [
      {
        target_user_id: input.targetUserId,
        target_pet_id: input.targetPetId ?? null,
        sender_name: input.senderName,
        sender_email: input.senderEmail,
        message: input.message,
        zip_code: input.zipCode ?? null,
        source_link_id: input.sourceLinkId ?? null,
        source_channel_key: input.sourceChannelKey ?? null,
        via_foster_me: input.viaFosterMe === true,
      },
    ]);
    const row = rows[0];
    if (!row) {
      throw new Error('Inquiry insert returned no row');
    }
    return toRecord(row);
  }

  async findById(id: string): Promise<InquiryRecord | null> {
    const rows = await this.dataAdapter.get<InquiryRow[]>(
      `${this.table}?select=${INQUIRY_SELECT}&id=eq.${encodeURIComponent(id)}&limit=1`
    );
    const row = rows[0];
    return row ? toRecord(row) : null;
  }

  async setSelfReportedSource(id: string, source: string): Promise<boolean> {
    const rows = await this.dataAdapter.update<InquiryRow[]>(
      `${this.table}?id=eq.${encodeURIComponent(id)}&self_reported_source=is.null`,
      { self_reported_source: source },
      { headers: { Prefer: 'return=representation' } }
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  async listSourcesByPetId(petId: string, sinceIso: string | null): Promise<InquirySourceRow[]> {
    const since = sinceIso ? `&created_at=gte.${encodeURIComponent(sinceIso)}` : '';
    const rows = await this.dataAdapter.get<
      Array<{
        source_link_id: string | null;
        source_channel_key: string | null;
        created_at: string;
      }>
    >(
      `${this.table}?select=source_link_id,source_channel_key,created_at&target_pet_id=eq.${encodeURIComponent(petId)}${since}&limit=10000`
    );
    return rows.map((row) => ({
      sourceLinkId: row.source_link_id,
      sourceChannelKey: row.source_channel_key,
      createdAt: row.created_at,
    }));
  }

  async listFosterMeSourcesByOwner(
    ownerId: string,
    sinceIso: string | null
  ): Promise<InquirySourceRow[]> {
    const since = sinceIso ? `&created_at=gte.${encodeURIComponent(sinceIso)}` : '';
    const rows = await this.dataAdapter.get<
      Array<{
        source_link_id: string | null;
        source_channel_key: string | null;
        created_at: string;
      }>
    >(
      `${this.table}?select=source_link_id,source_channel_key,created_at&target_user_id=eq.${encodeURIComponent(ownerId)}&via_foster_me=eq.true${since}&limit=10000`
    );
    return rows.map((row) => ({
      sourceLinkId: row.source_link_id,
      sourceChannelKey: row.source_channel_key,
      createdAt: row.created_at,
    }));
  }

  async countBySourceLinkIds(linkIds: string[]): Promise<Map<string, number>> {
    const totals = new Map<string, number>();
    if (linkIds.length === 0) return totals;
    const rows = await this.dataAdapter.get<Array<{ source_link_id: string | null }>>(
      `${this.table}?select=source_link_id&source_link_id=in.(${linkIds.join(',')})&limit=10000`
    );
    for (const row of rows) {
      if (!row.source_link_id) continue;
      totals.set(row.source_link_id, (totals.get(row.source_link_id) ?? 0) + 1);
    }
    return totals;
  }
}
