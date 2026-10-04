import type {
  CreateInquiryInput,
  IInquiryRepository,
  InquiryRecord,
} from '@api/domain/repositories/IInquiryRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';

type InquiryRow = {
  id: string;
  target_user_id: string;
  target_pet_id: string | null;
  sender_name: string;
  sender_email: string;
  message: string;
  created_at: string;
};

export class InquiryRepository implements IInquiryRepository {
  private readonly table: string;

  constructor(private readonly dataAdapter: DataAdapter) {
    this.table = process.env.SUPABASE_INQUIRIES_TABLE?.trim() || 'inquiries';
  }

  async create(input: CreateInquiryInput): Promise<InquiryRecord> {
    const rows = await this.dataAdapter.insertReturning<InquiryRow[]>(
      this.table,
      [
        {
          target_user_id: input.targetUserId,
          target_pet_id: input.targetPetId ?? null,
          sender_name: input.senderName,
          sender_email: input.senderEmail,
          message: input.message,
        },
      ]
    );
    const row = rows[0];
    if (!row) {
      throw new Error('Inquiry insert returned no row');
    }
    return {
      id: row.id,
      targetUserId: row.target_user_id,
      targetPetId: row.target_pet_id,
      senderName: row.sender_name,
      senderEmail: row.sender_email,
      message: row.message,
      createdAt: row.created_at,
    };
  }
}
