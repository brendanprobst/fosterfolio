import { useAuth } from "@client/auth";
import {
  fetchNotifications,
  updateNotification,
} from "@client/features/notifications/notificationsApi";
import type { InboxItem } from "@client/features/notifications/types";
import { fetchChannels } from "@client/features/petInsights/petInsightsApi";
import { PetInquiries } from "@client/pages/pets/PetInquiries";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authSignedIn, renderWithQueryClient } from "./support/renderWithProviders";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@client/features/notifications/notificationsApi", () => ({
  fetchNotifications: vi.fn(),
  updateNotification: vi.fn(),
}));

vi.mock("@client/features/petInsights/petInsightsApi", () => ({
  fetchChannels: vi.fn(),
}));

const unread: InboxItem = {
  id: "n1",
  type: "inquiry_received",
  readAt: null,
  archivedAt: null,
  createdAt: "2026-10-08T15:00:00.000Z",
  payload: {
    senderName: "Jamie",
    senderEmail: "jamie@example.com",
    message: "Can I meet Mochi?",
    petId: "pet-1",
    sourceChannelKey: "direct",
  },
  pet: { id: "pet-1", name: "Mochi", unavailable: false },
};

const read: InboxItem = {
  ...unread,
  id: "n2",
  readAt: "2026-10-07T12:00:00.000Z",
  createdAt: "2026-10-07T10:00:00.000Z",
  payload: { ...unread.payload, senderName: "Riley", message: "Is Mochi good with cats?" },
};

describe("PetInquiries", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authSignedIn());
    vi.mocked(fetchChannels).mockResolvedValue([]);
    vi.mocked(updateNotification).mockResolvedValue(undefined);
    vi.mocked(fetchNotifications).mockResolvedValue({ items: [unread, read], nextCursor: null });
  });

  it("lists read and unread inquiries for the pet together, with no tabs or archive", async () => {
    renderWithQueryClient(<PetInquiries petId="pet-1" petName="Mochi" ownerRef="alex" />);

    expect(await screen.findByRole("button", { name: /Jamie/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Riley/ })).toBeInTheDocument();
    expect(fetchNotifications).toHaveBeenCalledWith("test-token", "all", { petId: "pet-1" });
    expect(screen.queryByRole("group", { name: "Inbox filters" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open inbox" })).toHaveAttribute("href", "/inbox");

    fireEvent.click(screen.getByRole("button", { name: /Jamie/ }));
    expect(screen.getByRole("heading", { name: "Jamie" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reply by email" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as unread" })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(updateNotification).toHaveBeenCalledWith("test-token", "n1", { read: true }),
    );
  });

  it("shows an empty state when the pet has no inquiries", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue({ items: [], nextCursor: null });
    renderWithQueryClient(<PetInquiries petId="pet-1" petName="Mochi" ownerRef="alex" />);

    expect(await screen.findByText("No inquiries yet.")).toBeInTheDocument();
  });
});
