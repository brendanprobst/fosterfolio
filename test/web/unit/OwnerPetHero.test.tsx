import type { PetPublic } from "@client/features/pets";
import { OwnerPetHero } from "@client/pages/pets/OwnerPetHero";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@client/pages/pets/OwnerAnalyticsWidget", () => ({ OwnerAnalyticsWidget: () => null }));
vi.mock("@client/pages/pets/PetInquiries", () => ({ PetInquiries: () => null }));
vi.mock("@client/components/PetFacts", () => ({
  PetFacts: ({ title }: { title: React.ReactNode }) => <>{title}</>,
}));

// Stand-in composer: a button marks the draft dirty so the close guard can be exercised.
vi.mock("@client/features/posts", () => ({
  PostComposer: ({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) => (
    <button type="button" onClick={() => onDirtyChange?.(true)}>
      Type something
    </button>
  ),
}));

const pet = { id: "pet-1", name: "Mochi", status: "actively_fostering" } as PetPublic;

function openComposer() {
  render(<OwnerPetHero pet={pet} ownerRef="alex" petPath="/@alex/pet/pet-1" />);
  fireEvent.click(screen.getByRole("button", { name: "Post update" }));
}

describe("OwnerPetHero post update dialog", () => {
  afterEach(() => vi.restoreAllMocks());

  it("closes without asking when the draft is empty", () => {
    const confirm = vi.spyOn(window, "confirm");
    openComposer();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(confirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks before discarding a draft and stays open if the owner cancels", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    openComposer();
    fireEvent.click(screen.getByRole("button", { name: "Type something" }));

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(confirm).toHaveBeenCalledWith("Discard this update?");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
