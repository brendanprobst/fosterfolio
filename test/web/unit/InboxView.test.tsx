import type { InboxItem } from "@client/features/notifications/types";
import { InboxView } from "@client/pages/inbox/InboxView";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

const item: InboxItem = {
  id: "n1",
  type: "inquiry_received",
  readAt: null,
  archivedAt: null,
  createdAt: "2026-10-08T00:00:00.000Z",
  payload: {
    senderName: "Jamie",
    senderEmail: "jamie@example.com",
    zip: "94107",
    message: "Can I meet Mochi?",
    petId: "pet-1",
    sourceChannelKey: "lawn_sign",
    linkLabel: "front yard",
    selfReportedSource: null,
  },
  pet: { id: "pet-1", name: "Mochi", unavailable: false },
};

function Harness({ items }: { items: InboxItem[] }) {
  const [status, setStatus] = useState<"unread" | "all" | "archived">("unread");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <InboxView
      status={status}
      onStatus={setStatus}
      items={items}
      channels={[{ key: "lawn_sign", name: "Lawn sign", isPreset: true }]}
      ownerRef="alex"
      selectedId={selectedId}
      unreadCount={1}
      onOpen={(next) => setSelectedId(next.id)}
      onBack={() => setSelectedId(null)}
      onArchive={vi.fn()}
      onMarkUnread={vi.fn()}
    />
  );
}

describe("InboxView", () => {
  it("shows the sender, source, zip, pet link, and a reply subject", () => {
    render(<Harness items={[item]} />);
    fireEvent.click(screen.getByRole("button", { name: /Jamie/ }));
    expect(screen.getByRole("heading", { name: "Jamie" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "jamie@example.com" })).toHaveAttribute(
      "href",
      "mailto:jamie@example.com",
    );
    expect(screen.getAllByText("Can I meet Mochi?").length).toBeGreaterThan(0);
    expect(screen.getByText("via Lawn sign — front yard")).toBeInTheDocument();
    expect(screen.getByText("Near 94107")).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mochi" })).toHaveAttribute(
      "href",
      "/@alex/pet/pet-1",
    );
    expect(screen.getByRole("link", { name: "Reply by email" })).toHaveAttribute(
      "href",
      "mailto:jamie@example.com?subject=Re%3A%20Mochi",
    );
  });

  it("encodes a stored sender email so it can't add mailto: headers", () => {
    // Inquiries saved before the API tightened its email check can still hold this.
    const injected = "a@b.co?bcc=evil%40x.com&body=hi";
    render(
      <Harness items={[{ ...item, payload: { ...item.payload, senderEmail: injected } }]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Jamie/ }));
    expect(screen.getByRole("link", { name: injected })).toHaveAttribute(
      "href",
      "mailto:a@b.co%3Fbcc%3Devil%2540x.com%26body%3Dhi",
    );
    expect(screen.getByRole("link", { name: "Reply by email" })).toHaveAttribute(
      "href",
      "mailto:a@b.co%3Fbcc%3Devil%2540x.com%26body%3Dhi?subject=Re%3A%20Mochi",
    );
  });

  it("filters and shows an unavailable pet", () => {
    const onStatus = vi.fn();
    render(
      <InboxView
        status="archived"
        onStatus={onStatus}
        items={[
          {
            ...item,
            readAt: "2026-10-08T01:00:00.000Z",
            archivedAt: "2026-10-08T02:00:00.000Z",
            pet: { id: "pet-1", name: null, unavailable: true },
            payload: { ...item.payload, sourceChannelKey: "direct", selfReportedSource: "Shelter" },
          },
        ]}
        channels={[]}
        ownerRef="alex"
        selectedId="n1"
        unreadCount={0}
        onOpen={vi.fn()}
        onBack={vi.fn()}
        onArchive={vi.fn()}
        onMarkUnread={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Archived" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(onStatus).toHaveBeenCalledWith("all");
    expect(screen.getByText("No longer available")).toBeInTheDocument();
    expect(screen.getByText("Shelter")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move to inbox" })).toBeInTheDocument();
  });
});
