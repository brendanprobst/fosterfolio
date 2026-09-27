import { useAuth } from "@client/auth";
import { useOwnerPets } from "@client/features/pets";
import { useAuthorPosts } from "@client/features/posts";
import { useUser } from "@client/features/users";
import type { UserPublic } from "@client/features/users";
import { PublicProfilePage } from "@client/pages/users";
import { screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { authSignedIn, renderWithQueryClient } from "./support/renderWithProviders";

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
  return { ...actual, useOwnerPets: vi.fn() };
});

vi.mock("@client/features/posts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/posts")>();
  return { ...actual, useAuthorPosts: vi.fn() };
});

const user: UserPublic = {
  id: "owner-1",
  handle: "alex",
  displayName: "Alex Foster",
  avatarUrl: "https://cdn.example.com/alex.jpg",
  bio: null,
  city: "Austin",
  state: "TX",
  sheltersText: null,
  socialLinks: [],
  starCount: 3,
  createdAt: "2026-08-01T00:00:00.000Z",
};

describe("PublicProfilePage", () => {
  beforeEach(() => {
    // Signed in: the owner's own picture controls still must not appear here.
    vi.mocked(useAuth).mockReturnValue(authSignedIn());
    vi.mocked(usePathname).mockReturnValue("/@alex");
    vi.mocked(useUser).mockReturnValue({
      data: user,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useUser>);
    vi.mocked(useOwnerPets).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useOwnerPets>);
    vi.mocked(useAuthorPosts).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useAuthorPosts>);
  });

  it("shows the avatar read-only, with no way to edit it", () => {
    const { container } = renderWithQueryClient(<PublicProfilePage />);

    expect(screen.getByRole("img", { name: "Alex Foster" })).toHaveAttribute(
      "src",
      "https://cdn.example.com/alex.jpg",
    );
    expect(
      screen.queryByRole("button", { name: "Change profile picture" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Profile picture")).not.toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it("shows the handle and a guest sidebar with foster-me + inquiry", () => {
    renderWithQueryClient(<PublicProfilePage />);

    expect(screen.getByText("@alex")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /see who they’re fostering now/i }),
    ).toHaveAttribute("href", "/@alex/foster-me");
    expect(screen.getByText("Interested in adopting?")).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Contact this foster" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /edit profile/i })).not.toBeInTheDocument();
  });

  it("shows an owner sidebar instead of the inquiry form on your own public page", () => {
    vi.mocked(useAuth).mockReturnValue(
      authSignedIn({ id: "owner-1", email: "alex@example.com" } as User),
    );

    renderWithQueryClient(<PublicProfilePage />);

    expect(screen.getByText("Your public page")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /edit profile/i })).toHaveAttribute(
      "href",
      "/profile",
    );
    expect(screen.queryByRole("form", { name: "Contact this foster" })).not.toBeInTheDocument();
  });
});
