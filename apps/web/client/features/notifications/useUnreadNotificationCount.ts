"use client";

import { useAuth } from "@client/auth";
import { fetchUnreadCount } from "@client/features/notifications/notificationsApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { notificationKeys } from "./queryKeys";

/** Refetches on window focus (React Query default) and on route change. No websocket. */
export function useUnreadNotificationCount(enabled: boolean): number {
  const { getAccessToken } = useAuth();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: notificationKeys.unreadCount,
    enabled,
    queryFn: async () => {
      const token = await getAccessToken();
      return token ? fetchUnreadCount(token) : 0;
    },
  });

  useEffect(() => {
    if (enabled) void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
  }, [enabled, pathname, queryClient]);

  return enabled ? (query.data ?? 0) : 0;
}
