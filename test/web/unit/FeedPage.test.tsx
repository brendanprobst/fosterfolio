import { useAuth } from "@client/auth";
import { useFeed } from "@client/features/posts";
import { FeedPage } from "@client/pages/feed";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authLoggedOut, authSignedIn } from "./support/renderWithProviders";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@client/lib/fosterfolioFeatureFlags", () => ({
  isFosterfolioFeedEnabled: vi.fn(),
  isFosterfolioSearchEnabled: () => false,
}));

vi.mock("@client/features/posts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/posts")>();
  return {
    ...actual,
    useFeed: vi.fn(),
    useCreatePostMutation: () => ({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    }),
  };
});

vi.mock("@client/features/pets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/pets")>();
  return {
    ...actual,
    useOwnerPets: () => ({ data: [], isLoading: false }),
  };
});

vi.mock("@client/features/storage", () => ({
  useMediaUpload: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

function emptyFeed() {
  return {
    data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
    isLoading: false,
    isError: false,
    error: null,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
  };
}

describe("FeedPage", () => {
  beforeEach(async () => {
    const flags = await import("@client/lib/fosterfolioFeatureFlags");
    vi.mocked(flags.isFosterfolioFeedEnabled).mockReturnValue(true);
    vi.mocked(useAuth).mockReturnValue(authLoggedOut());
    vi.mocked(useFeed).mockReturnValue(emptyFeed() as ReturnType<typeof useFeed>);
  });

  it("renders the public feed heading when the flag is on", () => {
    render(<FeedPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Feed" })).toBeInTheDocument();
    expect(screen.getByText(/no posts yet/i)).toBeInTheDocument();
  });

  it("prompts signed-out visitors to sign in to post", () => {
    render(<FeedPage />);
    expect(screen.getByRole("link", { name: /sign in to post/i })).toHaveAttribute(
      "href",
      "/auth/sign-in?next=%2Ffeed",
    );
  });

  it("shows the composer when signed in", () => {
    vi.mocked(useAuth).mockReturnValue(authSignedIn());
    render(<FeedPage />);
    expect(screen.getByRole("form", { name: "Compose post" })).toBeInTheDocument();
  });

  it("shows the beta shell when the flag is off", async () => {
    const flags = await import("@client/lib/fosterfolioFeatureFlags");
    vi.mocked(flags.isFosterfolioFeedEnabled).mockReturnValue(false);
    render(<FeedPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Feed" })).toBeInTheDocument();
    expect(screen.getByText(/isn.t in this private beta/i)).toBeInTheDocument();
    expect(screen.queryByText(/no posts yet/i)).not.toBeInTheDocument();
  });
});
