import { InboxView } from "@client/pages/inbox/InboxView";
import type { InboxItem } from "@client/features/notifications/types";
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
      onSelect={(next) => setSelectedId(next.id)}
    />
  );
}

describe("InboxView", () => {
  it("emphasizes unread rows and shows source, zip, and reply", () => {
    render(<Harness items={[item]} />);
    fireEvent.click(screen.getByRole("button", { name: "Jamie" }));
    expect(screen.getByText("Can I meet Mochi?")).toBeInTheDocument();
    expect(screen.getByText("via Lawn sign — front yard")).toBeInTheDocument();
    expect(screen.getByText("Zip 94107")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mochi" })).toHaveAttribute(
      "href",
      "/@alex/pet/pet-1",
    );
    expect(screen.getByRole("link", { name: "Reply by email" })).toHaveAttribute(
      "href",
      "mailto:jamie@example.com",
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
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "archived" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "all" }));
    expect(onStatus).toHaveBeenCalledWith("all");
    expect(screen.getByText("No longer available")).toBeInTheDocument();
    expect(screen.getByText("Shelter")).toBeInTheDocument();
  });
});
