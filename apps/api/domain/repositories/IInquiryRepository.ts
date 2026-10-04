export type CreateInquiryInput = {
  targetUserId: string;
  targetPetId?: string | null;
  senderName: string;
  senderEmail: string;
  message: string;
};

export type InquiryRecord = {
  id: string;
  targetUserId: string;
  targetPetId: string | null;
  senderName: string;
  senderEmail: string;
  message: string;
  createdAt: string;
};

export interface IInquiryRepository {
  create(input: CreateInquiryInput): Promise<InquiryRecord>;
}
