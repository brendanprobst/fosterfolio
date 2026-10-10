"use client";

import { useAuth } from "@client/auth";
import { fetchUnreadCount } from "@client/features/notifications/notificationsApi";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/** Polls on focus and whenever the route changes. No websocket. */
export function useUnreadNotificationCount(enabled: boolean): number {
  const { getAccessToken } = useAuth();
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const token = await getAccessToken();
      if (!token) return;
      setCount(await fetchUnreadCount(token));
    } catch {
      setCount(0);
    }
  }, [enabled, getAccessToken]);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [enabled, load]);

  return count;
}
