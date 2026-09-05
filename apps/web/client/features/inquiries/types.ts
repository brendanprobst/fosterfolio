export type CreateInquiryPayload = {
  targetUserId: string;
  targetPetId?: string | null;
  senderName: string;
  senderEmail: string;
  message: string;
};

export type Inquiry = {
  id: string;
  targetUserId: string;
  targetPetId: string | null;
  senderName: string;
  senderEmail: string;
  message: string;
  createdAt: string;
};
