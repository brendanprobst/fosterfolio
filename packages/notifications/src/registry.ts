import type { NotificationTypeRegistration } from "./types";

const types = new Map<string, NotificationTypeRegistration>();

export function registerType(registration: NotificationTypeRegistration): void {
  const type = registration.type.trim();
  if (!type) {
    throw new Error("Notification type is required");
  }
  types.set(type, { ...registration, type });
}

export function getNotificationType(type: string): NotificationTypeRegistration | null {
  return types.get(type) ?? null;
}

export function listNotificationTypes(): NotificationTypeRegistration[] {
  return [...types.values()];
}

export function resetNotificationTypes(): void {
  types.clear();
}
