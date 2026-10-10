import { LinksManager } from "@client/pages/pets/LinksManager";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const channels = [
  { key: "lawn_sign", name: "Lawn sign", isPreset: true },
  { key: "instagram", name: "Instagram", isPreset: true },
];

describe("LinksManager", () => {
  it("shows the original QR and an empty active list", () => {
    render(
      <LinksManager
        petName="Mochi"
        petId="pet-1"
        ownerRef="alex"
        links={[]}
        channels={channels}
        onCreate={vi.fn()}
        onArchive={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Original QR" })).toBeInTheDocument();
    expect(screen.getByText(/Direct \/ original QR/)).toBeInTheDocument();
    expect(screen.getByText("No active tracked links yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lawn sign" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add custom channel" })).toBeInTheDocument();
  });

  it("groups active links by channel and collapses archived ones", () => {
    render(
      <LinksManager
        petName="Mochi"
        petId="pet-1"
        ownerRef="alex"
        channels={channels}
        onCreate={vi.fn()}
        onArchive={vi.fn()}
        links={[
          {
            id: "a",
            petId: "pet-1",
            code: "aaaaaa",
            channelKey: "lawn_sign",
            channelName: "Lawn sign",
            label: "front yard",
            archivedAt: null,
            views: 3,
            inquiries: 1,
          },
          {
            id: "b",
            petId: "pet-1",
            code: "bbbbbb",
            channelKey: "lawn_sign",
            channelName: "Lawn sign",
            label: "corner",
            archivedAt: null,
            views: 0,
            inquiries: 0,
          },
          {
            id: "c",
            petId: "pet-1",
            code: "cccccc",
            channelKey: "instagram",
            channelName: "Instagram",
            label: null,
            archivedAt: "2026-10-01T00:00:00.000Z",
            views: 2,
            inquiries: 0,
          },
        ]}
      />,
    );
    expect(screen.getByRole("region", { name: "Lawn sign" })).toBeInTheDocument();
    expect(screen.getByText("front yard")).toBeInTheDocument();
    expect(screen.getByText("3 views · 1 inquiries")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Instagram" })).not.toBeInTheDocument();
    expect(screen.getByText("Archived links")).toBeInTheDocument();
  });
});
