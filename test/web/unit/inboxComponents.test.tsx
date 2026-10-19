import { relativeReceived } from "@client/components/inbox";
import { InboxLayout } from "@client/components/inbox/InboxLayout";
import { InboxListItem } from "@client/components/inbox/InboxListItem";
import type { InboxEntry } from "@client/components/inbox/types";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const now = Date.parse("2026-10-09T12:00:00.000Z");

function entry(overrides: Partial<InboxEntry> = {}): InboxEntry {
  return {
    id: "n1",
    title: "Alex Foster",
    subtitle: "About Mochi",
    preview: "Is Mochi still available?",
    receivedAt: new Date(now - 5 * 60_000).toISOString(),
    unread: true,
    archived: false,
    ...overrides,
  };
}

describe("relativeReceived", () => {
  it("covers just now, minutes, yesterday, and weeks", () => {
    expect(relativeReceived(new Date(now - 10_000).toISOString(), now)).toBe("just now");
    expect(relativeReceived(new Date(now - 5 * 60_000).toISOString(), now)).toBe("5 minutes ago");
    expect(relativeReceived(new Date(now - 86_400_000).toISOString(), now)).toBe("yesterday");
    expect(relativeReceived(new Date(now - 14 * 86_400_000).toISOString(), now)).toBe("2 weeks ago");
  });

  it("returns an empty string for an invalid timestamp", () => {
    expect(relativeReceived("not-a-date", now)).toBe("");
  });
});

describe("InboxListItem", () => {
  it("renders an unread title in bold with a visible dot, and selects on click", () => {
    const onSelect = vi.fn();
    render(
      <ul>
        <InboxListItem entry={entry()} selected={false} onSelect={onSelect} />
      </ul>,
    );

    const row = screen.getByRole("button", { name: /Alex Foster/ });
    expect(row.querySelector(".font-semibold")).toHaveTextContent("Alex Foster");
    expect(screen.getByTestId("unread-dot")).toHaveClass("bg-primary");
    expect(screen.getByTestId("unread-dot")).not.toHaveClass("invisible");

    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith("n1");
  });

  it("marks the selected row with aria-current", () => {
    render(
      <ul>
        <InboxListItem entry={entry()} selected onSelect={vi.fn()} />
      </ul>,
    );

    expect(screen.getByRole("button", { name: /Alex Foster/ })).toHaveAttribute("aria-current", "true");
  });
});

describe("InboxLayout", () => {
  it("hides the message list on mobile when something is selected, and goes back", () => {
    const onBack = vi.fn();
    render(
      <InboxLayout
        hasSelection
        onBack={onBack}
        filters={<p>Filters</p>}
        list={<p>List</p>}
        detail={<p>Detail</p>}
      />,
    );

    expect(screen.getByRole("region", { name: "Messages" })).toHaveClass("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Back to inbox" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
