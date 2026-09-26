import { useAuth, useRequireAuth } from "@client/auth";
import { useOwnerPets } from "@client/features/pets";
import { useOwnUser, useUpdateUserMutation } from "@client/features/users";
import type { UserOwner } from "@client/features/users";
import { ProfilePage } from "@client/pages/profile";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authSignedIn, renderWithQueryClient } from "./support/renderWithProviders";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
  useRequireAuth: vi.fn(),
}));

vi.mock("@client/features/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/users")>();
  return { ...actual, useOwnUser: vi.fn(), useUpdateUserMutation: vi.fn() };
});

vi.mock("@client/features/pets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/pets")>();
  return { ...actual, useOwnerPets: vi.fn() };
});

vi.mock("@client/features/storage", () => ({
  useMediaUpload: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));

const profile: UserOwner = {
  id: "u1",
  email: "you@example.com",
  displayName: "Alex Foster",
  avatarUrl: null,
  bio: "Fostering since 2019",
  city: "Austin",
  state: "TX",
  zipCode: "78701",
  lat: null,
  lng: null,
  sheltersText: "Austin Pets Alive",
  socialLinks: [{ label: "Instagram", url: "https://example.com/alex" }],
  starCount: 2,
  createdAt: "2026-08-01T00:00:00.000Z",
};

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authSignedIn());
    vi.mocked(useRequireAuth).mockReturnValue({
      user: authSignedIn().user,
      loading: false,
      apiAuthAccepted: true,
    } as ReturnType<typeof useRequireAuth>);
    vi.mocked(useOwnUser).mockReturnValue({
      data: profile,
      isError: false,
      error: null,
    } as ReturnType<typeof useOwnUser>);
    vi.mocked(useOwnerPets).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useOwnerPets>);
    vi.mocked(useUpdateUserMutation).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useUpdateUserMutation>);
  });

  it("leads with the identity header and keeps the public link in the sidebar", () => {
    renderWithQueryClient(<ProfilePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Alex Foster" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Profile picture")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view public profile/i })).toHaveAttribute(
      "href",
      "/users/u1",
    );
  });

  it("summarizes location, shelters, and links without form fields", () => {
    renderWithQueryClient(<ProfilePage />);

    expect(screen.getByText("Austin, TX")).toBeInTheDocument();
    expect(screen.getByText("Austin Pets Alive")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Instagram" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Display name")).not.toBeInTheDocument();
  });

  it("opens the edit dialog on demand", async () => {
    renderWithQueryClient(<ProfilePage />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText("Display name")).toHaveValue("Alex Foster");
    expect(screen.getByLabelText("ZIP code")).toHaveValue("78701");
  });

  it("shows an empty state with a call to action when there are no pets", () => {
    renderWithQueryClient(<ProfilePage />);

    expect(screen.getByText("No pets yet")).toBeInTheDocument();
    const cta = screen.getByRole("button", { name: /add your first pet/i });
    fireEvent.click(cta);

    return waitFor(() =>
      expect(screen.getByRole("form", { name: "Add pet" })).toBeInTheDocument(),
    );
  });
});
