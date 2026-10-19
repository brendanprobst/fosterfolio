import type { NewNotification, NotificationRecord, OutboundEmail } from "./types";

/** Persistence port. The app's repository implements this. */
export interface InAppChannel {
  insert(input: NewNotification): Promise<NotificationRecord>;
  markEmailed(id: string, emailedAt: string): Promise<NotificationRecord>;
}

/** Mail port. The app adapts its existing mailer. This package has no SES client. */
export interface EmailChannel {
  send(message: OutboundEmail): Promise<void>;
}

/** `null` means no stored row, so dispatch uses the type's registered default. */
export interface NotificationPreferenceStore {
  getEmailEnabled(recipientId: string, type: string): Promise<boolean | null>;
}
