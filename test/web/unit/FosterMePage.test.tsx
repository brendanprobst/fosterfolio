import { useAuth } from "@client/auth";
import { useOwnerPets } from "@client/features/pets";
import type { PetPublic } from "@client/features/pets";
import { useUser } from "@client/features/users";
import type { UserPublic } from "@client/features/users";
import { captureFosterMeViewed } from "@client/lib/analytics/initFosterfolioAnalytics";
import { petHrefFromFosterMe } from "@client/lib/petBioPath";
import { FosterMePage } from "@client/pages/users";
import { screen } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import {
  authLoggedOut,
  authSignedIn,
  renderWithQueryClient,
} from "./support/renderWithProviders";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock("@client/features/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/users")>();
  return { ...actual, useUser: vi.fn() };
});

vi.mock("@client/features/pets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/pets")>();
  return { ...actual, useOwnerPets: vi.fn() };
});

vi.mock("@client/lib/analytics/initFosterfolioAnalytics", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@client/lib/analytics/initFosterfolioAnalytics")>();
  return { ...actual, captureFosterMeViewed: vi.fn() };
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
    photos: [],
    bioMarkdown: null,
    importantLinks: [],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    meta: { title: "Mochi · Fosterfolio", description: "", imageUrl: null },
    updates: [],
    ...overrides,
  };
}

const replace = vi.fn();

describe("FosterMePage", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(useAuth).mockReturnValue(authLoggedOut());
    vi.mocked(useRouter).mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(usePathname).mockReturnValue("/@alex/foster-me");
    vi.mocked(captureFosterMeViewed).mockClear();
    vi.mocked(useUser).mockReturnValue({
      data: user,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useUser>);
  });

  it("shows one active pet as a foster-me card", () => {
    const active = pet({ ageValue: 2, ageUnit: "years", size: "12 lb" });
    vi.mocked(useOwnerPets).mockReturnValue({
      data: [active],
      isLoading: false,
      isSuccess: true,
      isError: false,
    } as ReturnType<typeof useOwnerPets>);

    renderWithQueryClient(<FosterMePage />);

    expect(screen.getByRole("heading", { level: 1, name: "Meet Mochi" })).toBeInTheDocument();
    expect(screen.getByText("fostered by Alex Foster")).toBeInTheDocument();
    expect(screen.getByText("Weight 12 lb")).toBeInTheDocument();
    expect(screen.getByText("Age 2 years")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mochi" })).toHaveAttribute(
      "href",
      petHrefFromFosterMe("alex", "pet-1"),
    );
    expect(screen.getByRole("link", { name: "Mochi" })).not.toHaveAttribute("target");
    expect(
      screen.queryByText(/may not be who Alex Foster is fostering/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expand" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Manage links" })).not.toBeInTheDocument();
  });

  it("shows every active pet in one preview", () => {
    const mochi = pet();
    const biscuit = pet({ id: "pet-2", name: "Biscuit" });
    vi.mocked(useOwnerPets).mockReturnValue({
      data: [mochi, biscuit, pet({ id: "pet-3", name: "Past", status: "adopted" })],
      isLoading: false,
      isSuccess: true,
      isError: false,
    } as ReturnType<typeof useOwnerPets>);

    renderWithQueryClient(<FosterMePage />);

    expect(
      screen.getByRole("heading", { name: "Meet the pets Alex Foster is fostering." }),
    ).toBeInTheDocument();
    const mochiLink = screen.getByRole("link", { name: "Mochi (opens in a new tab)" });
    expect(mochiLink).toHaveAttribute("href", petHrefFromFosterMe("alex", "pet-1"));
    expect(mochiLink).toHaveAttribute("target", "_blank");
    // Opener keeps sessionStorage (first-touch attribution) in the new tab.
    expect(mochiLink).toHaveAttribute("rel", "opener");
    expect(
      screen.getByRole("link", { name: "Biscuit (opens in a new tab)" }),
    ).toHaveAttribute("href", petHrefFromFosterMe("alex", "pet-2"));
    expect(screen.queryByRole("link", { name: "Past" })).not.toBeInTheDocument();
  });

  it("shows a fallback notice when the latest pet is not actively fostering", () => {
    const adopted = pet({ status: "adopted", size: "8 lb" });
    vi.mocked(useOwnerPets).mockReturnValue({
      data: [adopted],
      isLoading: false,
      isSuccess: true,
      isError: false,
    } as ReturnType<typeof useOwnerPets>);

    renderWithQueryClient(<FosterMePage />);

    expect(screen.getByRole("status")).toHaveTextContent(
      /may not be who Alex Foster is fostering right now/i,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Meet Mochi" })).toBeInTheDocument();
    expect(screen.getByText("Weight 8 lb")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expand" })).not.toBeInTheDocument();
  });

  it("shows the owner the same preview plus manage links, without capture tools", () => {
    const active = pet();
    vi.mocked(useAuth).mockReturnValue(
      authSignedIn({ id: "owner-1", email: "alex@example.com" } as User),
    );
    vi.mocked(useOwnerPets).mockReturnValue({
      data: [active],
      isLoading: false,
      isSuccess: true,
      isError: false,
    } as ReturnType<typeof useOwnerPets>);

    renderWithQueryClient(<FosterMePage />);

    expect(screen.getByRole("heading", { name: "Meet Mochi" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage links" })).toHaveAttribute(
      "href",
      "/profile/links",
    );
    expect(screen.queryByRole("button", { name: "Expand" })).not.toBeInTheDocument();
    expect(screen.queryByRole("form", { name: /contact the foster/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/"Foster Me" Link/i)).not.toBeInTheDocument();
  });

  it("shows an empty state with profile and search links when there are no pets", () => {
    vi.mocked(useOwnerPets).mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      isError: false,
    } as ReturnType<typeof useOwnerPets>);
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
    expect(screen.queryByRole("link", { name: /browse other pets/i })).not.toBeInTheDocument();
    expect(
      screen.queryByText(/always opens whoever this foster is listing now/i),
    ).not.toBeInTheDocument();
  });

  it("shows a pets-list error instead of the empty roster copy", () => {
    vi.mocked(useOwnerPets).mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: true,
      error: new Error("Pets unavailable"),
    } as ReturnType<typeof useOwnerPets>);
    renderWithQueryClient(<FosterMePage />);

    expect(screen.getByText("Pets unavailable")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: /isn’t listed as fostering anyone right now/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("shows a shared error message once when profile and pets both fail", () => {
    vi.mocked(useUser).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Something went wrong on our end. Please try again later."),
    } as unknown as ReturnType<typeof useUser>);
    vi.mocked(useOwnerPets).mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: true,
      error: new Error("Something went wrong on our end. Please try again later."),
    } as ReturnType<typeof useOwnerPets>);
    renderWithQueryClient(<FosterMePage />);

    expect(
      screen.getAllByText("Something went wrong on our end. Please try again later."),
    ).toHaveLength(1);
  });

  it("shows a spinner, not a page skeleton, while loading", () => {
    vi.mocked(useOwnerPets).mockReturnValue({
      data: undefined,
      isLoading: true,
      isSuccess: false,
      isError: false,
    } as ReturnType<typeof useOwnerPets>);
    renderWithQueryClient(<FosterMePage />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  describe("foster_me_viewed capture", () => {
    beforeEach(() => {
      vi.mocked(useOwnerPets).mockReturnValue({
        data: [pet()],
        isLoading: false,
        isSuccess: true,
        isError: false,
      } as ReturnType<typeof useOwnerPets>);
    });

    it("skips the owner's own refresh when the profile loads before the session restores", () => {
      vi.mocked(useAuth).mockReturnValue({ ...authLoggedOut(), loading: true });

      const { rerender } = renderWithQueryClient(<FosterMePage />);
      expect(captureFosterMeViewed).not.toHaveBeenCalled();

      vi.mocked(useAuth).mockReturnValue(
        authSignedIn({ id: "owner-1", email: "alex@example.com" } as User),
      );
      rerender(<FosterMePage />);

      expect(captureFosterMeViewed).not.toHaveBeenCalled();
    });

    it("records one view once the session resolves signed out", () => {
      vi.mocked(useAuth).mockReturnValue({ ...authLoggedOut(), loading: true });

      const { rerender } = renderWithQueryClient(<FosterMePage />);
      vi.mocked(useAuth).mockReturnValue(authLoggedOut());
      rerender(<FosterMePage />);
      rerender(<FosterMePage />);

      expect(vi.mocked(captureFosterMeViewed).mock.calls).toEqual([
        [{ ownerId: "owner-1", petCount: 1 }],
      ]);
    });
  });

  describe("former handle (alias) URLs", () => {
    it("replaces the URL with the canonical handle, keeping the sub-path", () => {
      vi.mocked(usePathname).mockReturnValue("/@elisa-probst/foster-me");
      vi.mocked(useUser).mockReturnValue({
        data: { ...user, handle: "elisa", canonicalHandle: "elisa" },
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useUser>);

      renderWithQueryClient(<FosterMePage />);

      expect(replace).toHaveBeenCalledTimes(1);
      expect(replace).toHaveBeenCalledWith("/@elisa/foster-me");
    });

    it("does not redirect when the response has no canonicalHandle", () => {
      renderWithQueryClient(<FosterMePage />);

      expect(replace).not.toHaveBeenCalled();
    });
  });
});
