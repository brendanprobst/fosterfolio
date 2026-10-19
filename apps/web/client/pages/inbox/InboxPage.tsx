"use client";

import { useAuth, useRequireAuth } from "@client/auth";
import { AppShell, DataPageSkeleton } from "@client/components/layout";
import { fetchChannels } from "@client/features/petInsights/petInsightsApi";
import { fetchNotifications } from "@client/features/notifications/notificationsApi";
import { notificationKeys } from "@client/features/notifications/queryKeys";
import type { InboxItem } from "@client/features/notifications/types";
import { useNotificationActions } from "@client/features/notifications/useNotificationActions";
import { useUnreadNotificationCount } from "@client/features/notifications/useUnreadNotificationCount";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { InboxView, type InboxFilter } from "./InboxView";

export function InboxPage() {
  const { loading, user } = useRequireAuth();
  const { getAccessToken } = useAuth();
  const [status, setStatus] = useState<InboxFilter>("unread");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { markRead, markUnread, setArchived } = useNotificationActions();
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

  function open(item: InboxItem) {
    setSelectedId(item.id);
    markRead(item);
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
          onArchive={(item, archived) => setArchived(item, archived, () => setSelectedId(null))}
          onMarkUnread={markUnread}
        />
      </main>
    </AppShell>
  );
}
