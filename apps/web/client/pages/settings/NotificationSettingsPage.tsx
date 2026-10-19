"use client";

import { useAuth, useRequireAuth } from "@client/auth";
import { AppShell, DataPageSkeleton } from "@client/components/layout";
import {
  fetchNotificationPreferences,
  saveNotificationPreference,
} from "@client/features/notifications/notificationsApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function NotificationSettingsPage() {
  const { loading, user } = useRequireAuth();
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  const preferences = useQuery({
    queryKey: ["notification-preferences"],
    enabled: Boolean(user),
    queryFn: async () => fetchNotificationPreferences((await getAccessToken()) ?? ""),
  });
  const save = useMutation({
    mutationFn: async (emailEnabled: boolean) =>
      saveNotificationPreference((await getAccessToken()) ?? "", emailEnabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });

  if (loading || preferences.isLoading) {
    return (
      <AppShell>
        <main>
          <DataPageSkeleton variant="profile" label="Loading settings" />
        </main>
      </AppShell>
    );
  }

  const emailEnabled =
    preferences.data?.find((row) => row.type === "inquiry_received")?.emailEnabled ?? true;

  return (
    <AppShell>
      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Notifications</h1>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={emailEnabled}
            onChange={(event) => save.mutate(event.target.checked)}
          />
          Email me when I receive an inquiry.
        </label>
        <p className="text-muted-foreground mt-3 text-sm">
          In-app delivery stays on.
        </p>
      </main>
    </AppShell>
  );
}
