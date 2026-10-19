export type NotificationRecord = {
  id: string;
  recipientId: string;
  type: string;
  payload: Record<string, unknown>;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  archivedAt: string | null;
  emailedAt: string | null;
  createdAt: string;
};

export type NotificationEntityRef = {
  entityType: string;
  entityId: string;
};

export type RenderedEmail = {
  subject: string;
  text: string;
  replyTo?: string;
};

export type EmailTemplate = (payload: Record<string, unknown>) => RenderedEmail;

export type NotificationTypeRegistration = {
  type: string;
  emailTemplate: EmailTemplate;
  defaultEmailEnabled: boolean;
};

export type NewNotification = {
  recipientId: string;
  type: string;
  payload: Record<string, unknown>;
  entityType: string | null;
  entityId: string | null;
};

export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};
