export type CreateInquiryInput = {
  targetUserId: string;
  targetPetId?: string | null;
  senderName: string;
  senderEmail: string;
  message: string;
  zipCode?: string | null;
  sourceLinkId?: string | null;
  sourceChannelKey?: string | null;
  viaFosterMe?: boolean;
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
  viaFosterMe: boolean;
  selfReportedSource: string | null;
  createdAt: string;
};

/** Source fields only. Zip codes and emails stay off analytics reads. */
export type InquirySourceRow = {
  sourceLinkId: string | null;
  sourceChannelKey: string | null;
  createdAt: string;
};

export interface IInquiryRepository {
  create(input: CreateInquiryInput): Promise<InquiryRecord>;
  findById(id: string): Promise<InquiryRecord | null>;
  /** Returns false when the row is missing or already has a self-reported source. */
  setSelfReportedSource(id: string, source: string): Promise<boolean>;
  /** sinceIso is inclusive. Null returns every inquiry for the pet. */
  listSourcesByPetId(petId: string, sinceIso: string | null): Promise<InquirySourceRow[]>;
  /** Counts inquiries with that source_link_id. Direct inquiries are not included. */
  countBySourceLinkIds(linkIds: string[]): Promise<Map<string, number>>;
}
