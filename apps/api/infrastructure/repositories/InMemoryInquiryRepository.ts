import { randomUUID } from 'crypto';
import type {
  CreateInquiryInput,
  IInquiryRepository,
  InquiryRecord,
} from '@api/domain/repositories/IInquiryRepository';

export class InMemoryInquiryRepository implements IInquiryRepository {
  readonly records: InquiryRecord[] = [];

  async create(input: CreateInquiryInput): Promise<InquiryRecord> {
    const record: InquiryRecord = {
      id: randomUUID(),
      targetUserId: input.targetUserId,
      targetPetId: input.targetPetId ?? null,
      senderName: input.senderName.trim(),
      senderEmail: input.senderEmail.trim(),
      message: input.message.trim(),
      createdAt: new Date().toISOString(),
    };
    this.records.push(record);
    return record;
  }
}
