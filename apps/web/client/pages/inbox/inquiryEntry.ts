import type { InboxEntry } from "@client/components/inbox";
import type { InboxItem } from "@client/features/notifications/types";

const text = (value: string | null | undefined) => value?.trim() ?? "";

export function toInboxEntry(item: InboxItem): InboxEntry {
  const pet = item.pet?.name ? `About ${item.pet.name}` : undefined;
  return {
    id: item.id,
    title: text(item.payload.senderName) || "Someone",
    subtitle: pet,
    preview: text(item.payload.message).replace(/\s+/g, " ") || undefined,
    receivedAt: item.createdAt,
    unread: item.readAt == null && item.archivedAt == null,
    archived: item.archivedAt != null,
  };
}
