import { useAuth } from "@client/auth";
import { usePet } from "@client/features/pets";
import type { PetPublic } from "@client/features/pets";
import { PetBioPage } from "@client/pages/pets";
import { screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authLoggedOut, renderWithQueryClient } from "./support/renderWithProviders";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

vi.mock("@client/features/pets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/pets")>();
  return {
    ...actual,
    usePet: vi.fn(),
  };
});

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qq"),
  },
}));

const petId = "11111111-1111-1111-1111-111111111111";

const pet: PetPublic = {
  id: petId,
  ownerId: "owner-1",
  owner: {
    id: "owner-1",
    handle: null,
    displayName: "Alex Foster",
    avatarUrl: null,
  },
  name: "Mochi",
  species: "dog",
  breed: "mutt",
  ageValue: 2,
  ageUnit: "years",
  sex: "male",
  size: "medium",
  status: "actively_fostering",
  subStatus: null,
  shelterLinkName: null,
  shelterLinkUrl: null,
  primaryPhotoUrl: null,
  bioMarkdown: "A very good boy",
  importantLinks: [],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  meta: {
    title: "Mochi · Fosterfolio",
    description: "A very good boy",
    imageUrl: null,
  },
  updates: [],
};

describe("PetBioPage", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authLoggedOut());
    vi.mocked(usePathname).mockReturnValue(`/@owner-1/pet/${petId}`);
    document.title = "Fosterfolio";
  });

  it("sets document.title from meta and shows inquiry + QR", async () => {
    vi.mocked(usePet).mockReturnValue({
      data: pet,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePet>);

    renderWithQueryClient(<PetBioPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Mochi" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alex Foster" })).toHaveAttribute(
      "href",
      "/@owner-1",
    );
    expect(screen.getByRole("form", { name: "Contact the foster" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "QR code" })).toBeInTheDocument();
    expect(document.title).toBe("Mochi · Fosterfolio");
    expect(await screen.findByRole("button", { name: /download png/i })).toBeInTheDocument();
  });
});
