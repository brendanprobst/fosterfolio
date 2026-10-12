"use client";

import { useAuth } from "@client/auth";
import { updateNotification } from "@client/features/notifications/notificationsApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationKeys } from "./queryKeys";
import type { InboxItem, InboxPage } from "./types";

/**
 * Read / unread / archive with optimistic cache patches across every cached
 * inbox list (full inbox and per-pet lists) plus the unread badge.
 */
export function useNotificationActions() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  function patchItem(id: string, patch: Partial<InboxItem>) {
    queryClient.setQueriesData<InboxPage>({ queryKey: notificationKeys.lists }, (page) =>
      page ? { ...page, items: page.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) } : page,
    );
  }

  function bumpUnread(delta: number) {
    queryClient.setQueryData<number>(notificationKeys.unreadCount, (count) =>
      Math.max(0, (count ?? 0) + delta),
    );
  }

  const update = useMutation({
    mutationFn: async (variables: { id: string; body: { read?: boolean; archived?: boolean } }) =>
      updateNotification((await getAccessToken()) ?? "", variables.id, variables.body),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });

  function markRead(item: InboxItem) {
    if (item.readAt) return;
    patchItem(item.id, { readAt: new Date().toISOString() });
    bumpUnread(-1);
    update.mutate({ id: item.id, body: { read: true } });
  }

  function markUnread(item: InboxItem) {
    patchItem(item.id, { readAt: null });
    bumpUnread(1);
    update.mutate({ id: item.id, body: { read: false } });
  }

  function setArchived(item: InboxItem, archived: boolean, onSuccess?: () => void) {
    update.mutate(
      { id: item.id, body: { archived } },
      {
        onSuccess: () => {
          onSuccess?.();
          void queryClient.invalidateQueries({ queryKey: notificationKeys.lists });
        },
      },
    );
  }

  return { markRead, markUnread, setArchived };
}
