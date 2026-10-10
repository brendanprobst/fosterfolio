import { randomUUID } from 'crypto';
import type {
  CreateInquiryInput,
  IInquiryRepository,
  InquiryRecord,
  InquirySourceRow,
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
      zipCode: input.zipCode ?? null,
      sourceLinkId: input.sourceLinkId ?? null,
      sourceChannelKey: input.sourceChannelKey ?? null,
      viaFosterMe: input.viaFosterMe === true,
      selfReportedSource: null,
      createdAt: new Date().toISOString(),
    };
    this.records.push(record);
    return record;
  }

  async findById(id: string): Promise<InquiryRecord | null> {
    return this.records.find((row) => row.id === id) ?? null;
  }

  async setSelfReportedSource(id: string, source: string): Promise<boolean> {
    const row = this.records.find((item) => item.id === id);
    if (!row || row.selfReportedSource) return false;
    row.selfReportedSource = source;
    return true;
  }

  async listSourcesByPetId(petId: string, sinceIso: string | null): Promise<InquirySourceRow[]> {
    return this.records
      .filter(
        (row) =>
          row.targetPetId === petId && (sinceIso == null || row.createdAt >= sinceIso)
      )
      .map((row) => ({
        sourceLinkId: row.sourceLinkId,
        sourceChannelKey: row.sourceChannelKey,
        createdAt: row.createdAt,
      }));
  }

  async countBySourceLinkIds(linkIds: string[]): Promise<Map<string, number>> {
    const wanted = new Set(linkIds);
    const totals = new Map<string, number>();
    for (const row of this.records) {
      if (!row.sourceLinkId || !wanted.has(row.sourceLinkId)) continue;
      totals.set(row.sourceLinkId, (totals.get(row.sourceLinkId) ?? 0) + 1);
    }
    return totals;
  }

  seed(record: InquiryRecord): void {
    this.records.push(record);
  }
}
