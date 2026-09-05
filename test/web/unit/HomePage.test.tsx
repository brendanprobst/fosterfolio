import { useAuth } from "@client/auth";
import { HomePage } from "@client/pages/home";
import { useFeed } from "@client/features/posts";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authLoggedOut, authSignedIn } from "./support/renderWithProviders";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
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

describe("HomePage", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authLoggedOut());
    vi.mocked(useFeed).mockReturnValue(emptyFeed() as ReturnType<typeof useFeed>);
  });

  it("renders the public feed heading", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: "Feed" })).toBeInTheDocument();
    expect(screen.getByText(/no posts yet/i)).toBeInTheDocument();
  });

  it("prompts signed-out visitors to sign in to post", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: /sign in to post/i })).toHaveAttribute(
      "href",
      "/auth/sign-in?next=%2F",
    );
  });

  it("shows the composer when signed in", () => {
    vi.mocked(useAuth).mockReturnValue(authSignedIn());
    render(<HomePage />);
    expect(screen.getByRole("form", { name: "Compose post" })).toBeInTheDocument();
  });
});
