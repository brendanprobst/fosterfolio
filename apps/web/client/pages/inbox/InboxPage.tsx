"use client";

import { useAuth, useRequireAuth } from "@client/auth";
import { AppShell, DataPageSkeleton } from "@client/components/layout";
import { fetchChannels } from "@client/features/petInsights/petInsightsApi";
import {
  fetchNotifications,
  updateNotification,
} from "@client/features/notifications/notificationsApi";
import type { InboxItem } from "@client/features/notifications/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { InboxView, type InboxFilter } from "./InboxView";

export function InboxPage() {
  const { loading, user } = useRequireAuth();
  const { getAccessToken } = useAuth();
  const [status, setStatus] = useState<InboxFilter>("unread");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const inbox = useQuery({
    queryKey: ["notifications", status],
    enabled: Boolean(user),
    queryFn: async () => fetchNotifications((await getAccessToken()) ?? "", status),
  });
  const channels = useQuery({
    queryKey: ["me-channels"],
    enabled: Boolean(user),
    queryFn: async () => fetchChannels((await getAccessToken()) ?? ""),
  });
  const markRead = useMutation({
    mutationFn: async (item: InboxItem) => {
      if (item.readAt) return;
      await updateNotification((await getAccessToken()) ?? "", item.id, { read: true });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  if (loading || inbox.isLoading) {
    return (
      <AppShell>
        <main>
          <DataPageSkeleton variant="profile" label="Loading inbox" />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Inbox</h1>
        <InboxView
          status={status}
          onStatus={(next) => {
            setStatus(next);
            setSelectedId(null);
          }}
          items={inbox.data?.items ?? []}
          channels={channels.data ?? []}
          ownerRef={user?.id ?? ""}
          selectedId={selectedId}
          onSelect={(item) => {
            setSelectedId(item.id);
            markRead.mutate(item);
          }}
        />
      </main>
    </AppShell>
  );
}
