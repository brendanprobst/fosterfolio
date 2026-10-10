"use client";

import { useAuth, useRequireAuth } from "@client/auth";
import { AppShell, DataPageSkeleton } from "@client/components/layout";
import { fetchChannels } from "@client/features/petInsights/petInsightsApi";
import {
  fetchNotifications,
  updateNotification,
} from "@client/features/notifications/notificationsApi";
import { notificationKeys } from "@client/features/notifications/queryKeys";
import type { InboxItem, InboxPage as InboxListPage } from "@client/features/notifications/types";
import { useUnreadNotificationCount } from "@client/features/notifications/useUnreadNotificationCount";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { InboxView, type InboxFilter } from "./InboxView";

export function InboxPage() {
  const { loading, user } = useRequireAuth();
  const { getAccessToken } = useAuth();
  const [status, setStatus] = useState<InboxFilter>("unread");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const unreadCount = useUnreadNotificationCount(Boolean(user));

  const inbox = useQuery({
    queryKey: notificationKeys.list(status),
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
    queryFn: async () => fetchNotifications((await getAccessToken()) ?? "", status),
  });
  const channels = useQuery({
    queryKey: ["me-channels"],
    enabled: Boolean(user),
    queryFn: async () => fetchChannels((await getAccessToken()) ?? ""),
  });

  const items = inbox.data?.items ?? [];
  const selected = items.find((item) => item.id === selectedId) ?? null;

  function patchItem(id: string, patch: Partial<InboxItem>) {
    queryClient.setQueriesData<InboxListPage>({ queryKey: notificationKeys.lists }, (page) =>
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

  function open(item: InboxItem) {
    setSelectedId(item.id);
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

  function setArchived(item: InboxItem, archived: boolean) {
    update.mutate(
      { id: item.id, body: { archived } },
      {
        onSuccess: () => {
          setSelectedId(null);
          void queryClient.invalidateQueries({ queryKey: notificationKeys.lists });
        },
      },
    );
  }

  if (loading || (inbox.isLoading && !inbox.data)) {
    return (
      <AppShell>
        <main>
          <DataPageSkeleton variant="inbox" label="Loading inbox" />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Inbox</h1>
        <InboxView
          status={status}
          onStatus={(next) => {
            setStatus(next);
            setSelectedId(null);
          }}
          items={items}
          channels={channels.data ?? []}
          ownerRef={user?.id ?? ""}
          selectedId={selected ? selectedId : null}
          unreadCount={unreadCount}
          listDimmed={inbox.isFetching && inbox.isPlaceholderData}
          onOpen={open}
          onBack={() => setSelectedId(null)}
          onArchive={setArchived}
          onMarkUnread={markUnread}
        />
      </main>
    </AppShell>
  );
}
