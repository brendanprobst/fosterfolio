import type { EmailChannel, InAppChannel, NotificationPreferenceStore } from "./channels";
import { getNotificationType } from "./registry";
import type { NotificationEntityRef, NotificationRecord, OutboundEmail } from "./types";

export class UnknownNotificationTypeError extends Error {
  readonly type: string;

  constructor(type: string) {
    super(`Unknown notification type: ${type}`);
    this.name = "UnknownNotificationTypeError";
    this.type = type;
  }
}

export type DispatchDependencies = {
  inApp: InAppChannel;
  email: EmailChannel;
  preferences: NotificationPreferenceStore;
};

export type DispatchInput = {
  recipientId: string;
  recipientEmail: string;
  type: string;
  payload: Record<string, unknown>;
  entityRef: NotificationEntityRef | null;
};

export type DispatchResult = {
  notification: NotificationRecord;
  emailed: boolean;
};

/**
 * Writes the in-app row, then sends email when the preference (or the type default) is on.
 * A failed send leaves the row in place and does not throw.
 */
export async function dispatch(
  deps: DispatchDependencies,
  input: DispatchInput,
): Promise<DispatchResult> {
  const registration = getNotificationType(input.type);
  if (!registration) {
    throw new UnknownNotificationTypeError(input.type);
  }

  const notification = await deps.inApp.insert({
    recipientId: input.recipientId,
    type: registration.type,
    payload: input.payload,
    entityType: input.entityRef?.entityType ?? null,
    entityId: input.entityRef?.entityId ?? null,
  });

  const stored = await deps.preferences.getEmailEnabled(input.recipientId, registration.type);
  const emailEnabled = stored ?? registration.defaultEmailEnabled;
  if (!emailEnabled) {
    return { notification, emailed: false };
  }

  const rendered = registration.emailTemplate(input.payload);
  const message: OutboundEmail = {
    to: input.recipientEmail,
    subject: rendered.subject,
    text: rendered.text,
  };
  if (rendered.replyTo) {
    message.replyTo = rendered.replyTo;
  }

  try {
    await deps.email.send(message);
  } catch {
    return { notification, emailed: false };
  }

  const emailedAt = new Date().toISOString();
  const updated = await deps.inApp.markEmailed(notification.id, emailedAt);
  return { notification: updated, emailed: true };
}
