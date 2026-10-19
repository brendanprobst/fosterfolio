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

// The header's inbox badge polls the API; these tests are about search results.
vi.mock("@client/features/notifications/useUnreadNotificationCount", () => ({
  useUnreadNotificationCount: vi.fn(() => 0),
}));

vi.mock("@client/lib/fosterfolioFeatureFlags", () => ({
  isFosterfolioFeedEnabled: () => false,
  isFosterfolioSearchEnabled: vi.fn(() => true),
}));

vi.mock("@client/features/search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/search")>();
  return {
    ...actual,
    useSearch: vi.fn(),
  };
});

describe("SearchPage", () => {
  beforeEach(async () => {
    vi.mocked(useAuth).mockReturnValue(authLoggedOut());
    const flags = await import("@client/lib/fosterfolioFeatureFlags");
    vi.mocked(flags.isFosterfolioSearchEnabled).mockReturnValue(true);
  });

  it("shows the beta shell when the flag is off", async () => {
    const flags = await import("@client/lib/fosterfolioFeatureFlags");
    vi.mocked(flags.isFosterfolioSearchEnabled).mockReturnValue(false);
    render(<SearchPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Search" })).toBeInTheDocument();
    expect(screen.getByText(/isn.t in this private beta/i)).toBeInTheDocument();
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
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
            ownerHandle: "alex",
          },
        ],
        users: [
          {
            id: "owner-1",
            handle: "alex",
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
    expect(screen.getByRole("link", { name: /Mochi/i })).toHaveAttribute(
      "href",
      "/@alex/pet/pet-1",
    );
    expect(screen.getByRole("link", { name: /Alex/i })).toHaveAttribute(
      "href",
      "/@alex",
    );
  });

  it("falls back to the owner id when no handle is claimed", () => {
    vi.mocked(useSearch).mockReturnValue({
      data: {
        pets: [
          {
            id: "pet-1",
            name: "Mochi",
            species: "dog",
            primaryPhotoUrl: null,
            ownerId: "owner-1",
            ownerHandle: null,
          },
        ],
        users: [
          {
            id: "owner-1",
            handle: null,
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

    expect(screen.getByRole("link", { name: /Mochi/i })).toHaveAttribute(
      "href",
      "/@owner-1/pet/pet-1",
    );
    expect(screen.getByRole("link", { name: /Alex/i })).toHaveAttribute(
      "href",
      "/@owner-1",
    );
  });
});
