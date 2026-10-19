import { useAuth } from "@client/auth";
import { fetchUnreadCount } from "@client/features/notifications/notificationsApi";
import { notificationKeys } from "@client/features/notifications/queryKeys";
import { useUnreadNotificationCount } from "@client/features/notifications/useUnreadNotificationCount";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authLoggedOut, authSignedIn, createTestQueryClient } from "./support/renderWithProviders";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@client/features/notifications/notificationsApi", () => ({
  fetchUnreadCount: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

function renderCount(enabled: boolean) {
  const client = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  const hook = renderHook(
    () => ({
      count: useUnreadNotificationCount(enabled),
      queryClient: useQueryClient(),
    }),
    { wrapper: Wrapper },
  );
  return { ...hook, client };
}

describe("useUnreadNotificationCount", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authLoggedOut());
    vi.mocked(fetchUnreadCount).mockReset();
  });

  it("stays at 0 and does not fetch when disabled", () => {
    const { result } = renderCount(false);
    expect(result.current.count).toBe(0);
    expect(fetchUnreadCount).not.toHaveBeenCalled();
  });

  it("returns the fetched count for a signed-in user", async () => {
    vi.mocked(useAuth).mockReturnValue(authSignedIn());
    vi.mocked(fetchUnreadCount).mockResolvedValue(3);

    const { result } = renderCount(true);

    await waitFor(() => expect(result.current.count).toBe(3));
    expect(fetchUnreadCount).toHaveBeenCalledWith("test-token");
  });

  it("falls back to 0 when the count request fails", async () => {
    vi.mocked(useAuth).mockReturnValue(authSignedIn());
    vi.mocked(fetchUnreadCount).mockRejectedValue(new Error("offline"));

    const { result } = renderCount(true);

    await waitFor(() => expect(fetchUnreadCount).toHaveBeenCalled());
    expect(result.current.count).toBe(0);
  });

  it("updates when another caller writes the shared unread-count key", async () => {
    vi.mocked(useAuth).mockReturnValue(authSignedIn());
    vi.mocked(fetchUnreadCount).mockResolvedValue(1);

    const { result } = renderCount(true);
    await waitFor(() => {
      const state = result.current.queryClient.getQueryState(notificationKeys.unreadCount);
      expect(state?.fetchStatus).toBe("idle");
      expect(result.current.count).toBe(1);
    });

    act(() => {
      result.current.queryClient.setQueryData(notificationKeys.unreadCount, 4);
    });

    expect(result.current.queryClient.getQueryData(notificationKeys.unreadCount)).toBe(4);
    await waitFor(() => expect(result.current.count).toBe(4));
  });
});
