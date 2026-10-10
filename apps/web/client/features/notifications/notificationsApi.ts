import { authenticatedApiRequest } from "@client/lib/authenticatedApi";
import { throwIfNotOk } from "@client/lib/readApiError";
import type { InboxPage, NotificationPreference } from "./types";

export async function fetchNotifications(
  token: string,
  status: "unread" | "all" | "archived",
): Promise<InboxPage> {
  const response = await authenticatedApiRequest(
    `/me/notifications?status=${status}&limit=20`,
    { token, method: "GET" },
  );
  await throwIfNotOk(response, "Failed to load inbox.");
  return (await response.json()) as InboxPage;
}

export async function fetchUnreadCount(token: string): Promise<number> {
  const response = await authenticatedApiRequest("/me/notifications/unread-count", {
    token,
    method: "GET",
  });
  await throwIfNotOk(response, "Failed to load unread count.");
  const body = (await response.json()) as { count?: number };
  return body.count ?? 0;
}

export async function updateNotification(
  token: string,
  id: string,
  body: { read?: boolean; archived?: boolean },
): Promise<void> {
  const response = await authenticatedApiRequest(`/me/notifications/${encodeURIComponent(id)}`, {
    token,
    method: "PATCH",
    body: JSON.stringify(body),
  });
  await throwIfNotOk(response, "Failed to update notification.");
}

export async function fetchNotificationPreferences(
  token: string,
): Promise<NotificationPreference[]> {
  const response = await authenticatedApiRequest("/me/notification-preferences", {
    token,
    method: "GET",
  });
  await throwIfNotOk(response, "Failed to load notification settings.");
  const body = (await response.json()) as { preferences: NotificationPreference[] };
  return body.preferences;
}

export async function saveNotificationPreference(
  token: string,
  emailEnabled: boolean,
): Promise<void> {
  const response = await authenticatedApiRequest("/me/notification-preferences", {
    token,
    method: "PUT",
    body: JSON.stringify({ type: "inquiry_received", emailEnabled }),
  });
  await throwIfNotOk(response, "Failed to save notification settings.");
}
