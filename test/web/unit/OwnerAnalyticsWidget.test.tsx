import { PetBioSidebar } from "@client/pages/pets/PetBioSidebar";
import { screen } from "@testing-library/react";
import { renderWithQueryClient } from "./support/renderWithProviders";
import { describe, expect, it, vi } from "vitest";

vi.mock("@client/pages/pets/OwnerAnalyticsWidget", () => ({
  OwnerAnalyticsWidget: () => <a href="/analytics">View analytics</a>,
}));

const base = {
  petName: "Mochi",
  petId: "pet-1",
  petPath: "/@alex/pet/pet-1",
  ownerId: "owner-1",
  ownerRef: "alex",
  ownerName: "Alex",
  ownerAvatarUrl: null,
  isActivelyFostering: true,
};

describe("owner analytics widget", () => {
  it("is hidden from guests and other signed-in visitors", () => {
    renderWithQueryClient(<PetBioSidebar {...base} isOwner={false} />);
    expect(screen.queryByRole("link", { name: "View analytics" })).not.toBeInTheDocument();
    expect(screen.queryByText("Share this bio")).not.toBeInTheDocument();
  });

  it("replaces the QR card for the owner", () => {
    renderWithQueryClient(<PetBioSidebar {...base} isOwner />);
    expect(screen.getByRole("link", { name: "View analytics" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "QR code" })).not.toBeInTheDocument();
  });
});
