import { useAuth } from "@client/auth";
import { useOwnerPets, usePet } from "@client/features/pets";
import type { PetPublic } from "@client/features/pets";
import { useUser } from "@client/features/users";
import type { UserPublic } from "@client/features/users";
import { FosterMePage } from "@client/pages/users";
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

vi.mock("@client/features/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/users")>();
  return { ...actual, useUser: vi.fn() };
});

vi.mock("@client/features/pets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/pets")>();
  return { ...actual, useOwnerPets: vi.fn(), usePet: vi.fn() };
});

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qq"),
  },
}));

const user: UserPublic = {
  id: "owner-1",
  handle: "alex",
  displayName: "Alex Foster",
  avatarUrl: null,
  bio: null,
  city: null,
  state: null,
  sheltersText: null,
  socialLinks: [],
  starCount: 0,
  createdAt: "2026-08-01T00:00:00.000Z",
};

function pet(overrides: Partial<PetPublic> = {}): PetPublic {
  return {
    id: "pet-1",
    ownerId: "owner-1",
    owner: {
      id: "owner-1",
      handle: "alex",
      displayName: "Alex Foster",
      avatarUrl: null,
    },
    name: "Mochi",
    species: "dog",
    breed: null,
    ageValue: null,
    ageUnit: null,
    sex: null,
    size: null,
    status: "actively_fostering",
    subStatus: null,
    shelterLinkName: null,
    shelterLinkUrl: null,
    primaryPhotoUrl: null,
    bioMarkdown: null,
    importantLinks: [],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    meta: { title: "Mochi · Fosterfolio", description: "", imageUrl: null },
    updates: [],
    ...overrides,
  };
}

describe("FosterMePage", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authLoggedOut());
    vi.mocked(usePathname).mockReturnValue("/@alex/foster-me");
    vi.mocked(useUser).mockReturnValue({
      data: user,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useUser>);
  });

  it("shows an actively fostering pet with no extra messaging", () => {
    const active = pet();
    vi.mocked(useOwnerPets).mockReturnValue({
      data: [active],
      isLoading: false,
      isSuccess: true,
      isError: false,
    } as ReturnType<typeof useOwnerPets>);
    vi.mocked(usePet).mockReturnValue({
      data: active,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePet>);

    renderWithQueryClient(<FosterMePage />);

    expect(screen.getByRole("heading", { level: 1, name: "Mochi" })).toBeInTheDocument();
    expect(
      screen.queryByText(/may not be who Alex Foster is fostering/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/always opens whoever this foster is listing now/i),
    ).toBeInTheDocument();
  });

  it("shows a fallback notice when the latest pet is not actively fostering", () => {
    const adopted = pet({ status: "adopted" });
    vi.mocked(useOwnerPets).mockReturnValue({
      data: [adopted],
      isLoading: false,
      isSuccess: true,
      isError: false,
    } as ReturnType<typeof useOwnerPets>);
    vi.mocked(usePet).mockReturnValue({
      data: adopted,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePet>);

    renderWithQueryClient(<FosterMePage />);

    expect(screen.getByRole("status")).toHaveTextContent(
      /may not be who Alex Foster is fostering right now/i,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Mochi" })).toBeInTheDocument();
  });

  it("shows an empty state with profile and search links when there are no pets", () => {
    vi.mocked(useOwnerPets).mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      isError: false,
    } as ReturnType<typeof useOwnerPets>);
    vi.mocked(usePet).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePet>);

    renderWithQueryClient(<FosterMePage />);

    expect(
      screen.getByRole("heading", {
        name: /Alex Foster isn’t listed as fostering anyone right now/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view alex foster’s profile/i })).toHaveAttribute(
      "href",
      "/@alex",
    );
    expect(screen.getByRole("link", { name: /browse other pets/i })).toHaveAttribute(
      "href",
      "/search",
    );
    expect(
      screen.getByText(/always opens whoever this foster is listing now/i),
    ).toBeInTheDocument();
  });

  it("shows a pets-list error instead of the empty roster copy", () => {
    vi.mocked(useOwnerPets).mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: true,
      error: new Error("Pets unavailable"),
    } as ReturnType<typeof useOwnerPets>);
    vi.mocked(usePet).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePet>);

    renderWithQueryClient(<FosterMePage />);

    expect(screen.getByText("Pets unavailable")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: /isn’t listed as fostering anyone right now/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("shows a selected-pet error instead of a blank main", () => {
    const active = pet();
    vi.mocked(useOwnerPets).mockReturnValue({
      data: [active],
      isLoading: false,
      isSuccess: true,
      isError: false,
    } as ReturnType<typeof useOwnerPets>);
    vi.mocked(usePet).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Failed to load pet."),
    } as ReturnType<typeof usePet>);

    renderWithQueryClient(<FosterMePage />);

    expect(screen.getByText("Failed to load pet.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Mochi" })).not.toBeInTheDocument();
  });
});
