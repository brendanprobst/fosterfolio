export type CreateInquiryInput = {
  targetUserId: string;
  targetPetId?: string | null;
  senderName: string;
  senderEmail: string;
  message: string;
  zipCode?: string | null;
  sourceLinkId?: string | null;
  sourceChannelKey?: string | null;
};

export type InquiryRecord = {
  id: string;
  targetUserId: string;
  targetPetId: string | null;
  senderName: string;
  senderEmail: string;
  message: string;
  zipCode: string | null;
  sourceLinkId: string | null;
  sourceChannelKey: string | null;
  selfReportedSource: string | null;
  createdAt: string;
};

export interface IInquiryRepository {
  create(input: CreateInquiryInput): Promise<InquiryRecord>;
  findById(id: string): Promise<InquiryRecord | null>;
  /** Returns false when the row is missing or already has a self-reported source. */
  setSelfReportedSource(id: string, source: string): Promise<boolean>;
}
