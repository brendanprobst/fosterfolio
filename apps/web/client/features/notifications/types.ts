export type InboxPet = {
  id: string;
  name: string | null;
  unavailable: boolean;
};

export type InboxItem = {
  id: string;
  type: string;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  payload: {
    senderName?: string | null;
    senderEmail?: string | null;
    zip?: string | null;
    message?: string | null;
    petId?: string | null;
    sourceChannelKey?: string | null;
    linkLabel?: string | null;
    selfReportedSource?: string | null;
  };
  pet: InboxPet | null;
};

export type InboxPage = {
  items: InboxItem[];
  nextCursor: string | null;
};

export type NotificationPreference = {
  type: string;
  emailEnabled: boolean;
};
