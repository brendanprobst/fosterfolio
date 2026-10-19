import { useAuth, useRequireAuth } from "@client/auth";
import {
  fetchNotifications,
  fetchUnreadCount,
  updateNotification,
} from "@client/features/notifications/notificationsApi";
import type { InboxItem } from "@client/features/notifications/types";
import { fetchChannels } from "@client/features/petInsights/petInsightsApi";
import { InboxPage } from "@client/pages/inbox/InboxPage";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authSignedIn, renderWithQueryClient } from "./support/renderWithProviders";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
  useRequireAuth: vi.fn(),
}));

vi.mock("@client/features/notifications/notificationsApi", () => ({
  fetchNotifications: vi.fn(),
  fetchUnreadCount: vi.fn(),
  updateNotification: vi.fn(),
}));

vi.mock("@client/features/petInsights/petInsightsApi", () => ({
  fetchChannels: vi.fn(),
}));

const item: InboxItem = {
  id: "n1",
  type: "inquiry_received",
  readAt: null,
  archivedAt: null,
  createdAt: "2026-10-08T15:00:00.000Z",
  payload: {
    senderName: "Jamie",
    senderEmail: "jamie@example.com",
    zip: "94107",
    message: "Can I meet Mochi?",
    petId: "pet-1",
    sourceChannelKey: "direct",
    selfReportedSource: null,
  },
  pet: { id: "pet-1", name: "Mochi", unavailable: false },
};

function pageFor(status: "unread" | "all" | "archived", archived: boolean) {
  const row: InboxItem = {
    ...item,
    readAt: archived ? "2026-10-08T16:00:00.000Z" : item.readAt,
    archivedAt: archived ? "2026-10-08T17:00:00.000Z" : null,
  };
  if (status === "archived") return { items: archived ? [row] : [], nextCursor: null };
  if (status === "unread") return { items: archived ? [] : [{ ...item }], nextCursor: null };
  return { items: [row], nextCursor: null };
}

describe("InboxPage", () => {
  let archived = false;

  beforeEach(() => {
    archived = false;
    vi.mocked(useAuth).mockReturnValue(authSignedIn());
    vi.mocked(useRequireAuth).mockReturnValue({
      user: authSignedIn().user,
      loading: false,
      apiAuthAccepted: true,
    } as ReturnType<typeof useRequireAuth>);
    vi.mocked(fetchUnreadCount).mockResolvedValue(1);
    vi.mocked(fetchChannels).mockResolvedValue([]);
    vi.mocked(updateNotification).mockResolvedValue(undefined);
    vi.mocked(fetchNotifications).mockImplementation(async (_token, status) => pageFor(status, archived));
  });

  it("keeps the previous list when switching filters and skips the inbox skeleton", async () => {
    let releaseAll: (page: { items: InboxItem[]; nextCursor: null }) => void = () => {};
    vi.mocked(fetchNotifications).mockImplementation((_token, status) => {
      if (status === "all") {
        return new Promise((resolve) => {
          releaseAll = resolve;
        });
      }
      return Promise.resolve(pageFor(status, false));
    });

    renderWithQueryClient(<InboxPage />);
    expect(await screen.findByRole("button", { name: /Jamie/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^All$/ }));

    await waitFor(() => expect(fetchNotifications).toHaveBeenCalledWith("test-token", "all"));
    expect(screen.queryByRole("status", { name: "Loading inbox" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Jamie/ })).toBeInTheDocument();
    releaseAll({ items: [], nextCursor: null });
  });

  it("keeps an opened unread inquiry in the list and marks it read", async () => {
    renderWithQueryClient(<InboxPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Jamie/ }));

    expect(screen.getByRole("button", { name: /Jamie/ })).toBeInTheDocument();
    expect(screen.getAllByText("Can I meet Mochi?").length).toBeGreaterThan(0);
    await waitFor(() =>
      expect(updateNotification).toHaveBeenCalledWith("test-token", "n1", { read: true }),
    );
  });

  it("archives an inquiry and shows it on the Archived tab after refetch", async () => {
    vi.mocked(updateNotification).mockImplementation(async (_token, _id, body) => {
      if (body.archived) archived = true;
    });

    renderWithQueryClient(<InboxPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Jamie/ }));
    fireEvent.click(screen.getByRole("button", { name: "Archive", exact: true }));

    await waitFor(() =>
      expect(updateNotification).toHaveBeenCalledWith("test-token", "n1", { archived: true }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Archived", exact: true }));
    expect(await screen.findByRole("button", { name: /Jamie/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Jamie" })).not.toBeInTheDocument();
  });

  it("shows the sender name, email, and a received time", async () => {
    renderWithQueryClient(<InboxPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Jamie/ }));

    expect(screen.getByRole("heading", { name: "Jamie" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "jamie@example.com" })).toHaveAttribute(
      "href",
      "mailto:jamie@example.com",
    );
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it("marks a read inquiry unread", async () => {
    renderWithQueryClient(<InboxPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Jamie/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Mark as unread" }));

    await waitFor(() =>
      expect(updateNotification).toHaveBeenCalledWith("test-token", "n1", { read: false }),
    );
  });
});
