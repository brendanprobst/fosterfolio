import { useAuth } from "@client/auth";
import { useSearch } from "@client/features/search";
import { SearchPage } from "@client/pages/search";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authLoggedOut } from "./support/renderWithProviders";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("q=mochi"),
}));

vi.mock("@client/features/search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/search")>();
  return {
    ...actual,
    useSearch: vi.fn(),
  };
});

describe("SearchPage", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authLoggedOut());
  });

  it("lists pet and user hits for the query", () => {
    vi.mocked(useSearch).mockReturnValue({
      data: {
        pets: [
          {
            id: "pet-1",
            name: "Mochi",
            species: "dog",
            primaryPhotoUrl: null,
            ownerId: "owner-1",
          },
        ],
        users: [
          {
            id: "owner-1",
            displayName: "Alex",
            avatarUrl: null,
            city: "Austin",
            state: "TX",
          },
        ],
      },
      isLoading: false,
      isError: false,
      isSuccess: true,
      error: null,
    } as ReturnType<typeof useSearch>);

    render(<SearchPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mochi/i })).toHaveAttribute("href", "/pets/pet-1");
    expect(screen.getByRole("link", { name: /Alex/i })).toHaveAttribute("href", "/users/owner-1");
  });
});
