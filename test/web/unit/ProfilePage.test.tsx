import { useAuth, useRequireAuth } from "@client/auth";
import { BIO_PREVIEW_MAX_LINES } from "@client/lib/bioPreview";
import { useOwnerPets, type PetPublic } from "@client/features/pets";
import { useOwnUser, useUpdateUserMutation } from "@client/features/users";
import type { UserOwner } from "@client/features/users";
import { ProfilePage } from "@client/pages/profile";
import { fireEvent, screen } from "@testing-library/react";
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

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qq"),
  },
}));

const profile: UserOwner = {
  id: "u1",
  handle: null,
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

  it("leads with the identity header and shares public URLs from one sidebar card", () => {
    renderWithQueryClient(<ProfilePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Alex Foster" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Fostering since 2019")).toBeInTheDocument();
    expect(screen.getByLabelText("Profile picture")).toBeInTheDocument();
    expect(screen.queryByText("Private editor")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /view public profile/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Sharing your profile")).toBeInTheDocument();
    expect(
      screen.getByText(/this editor is private/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no handle yet — public links use your id/i),
    ).toBeInTheDocument();
    expect(screen.getByText("/@u1")).toBeInTheDocument();
    expect(screen.getByText("/@u1/foster-me")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Profile Link" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: '"Foster Me" Link' })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Profile Link" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: '"Foster Me" Link' })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preview Profile Link" })).toHaveAttribute(
      "href",
      "/@u1",
    );
    expect(
      screen.getByRole("link", { name: 'Preview "Foster Me" Link' }),
    ).toHaveAttribute("href", "/@u1/foster-me");
    expect(
      screen.getByText(/always opens whoever you’re fostering now/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/pet-specific share link on the pet bio page/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /QR code/i })).not.toBeInTheDocument();
  });

  it("opens a download-only QR modal from the share card", async () => {
    renderWithQueryClient(<ProfilePage />);

    fireEvent.click(screen.getByRole("button", { name: "Profile Link QR code" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Profile QR" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /download png/i })).toBeInTheDocument();
  });

  it("shows a claimed handle and handle-based share links", () => {
    vi.mocked(useOwnUser).mockReturnValue({
      data: { ...profile, handle: "alex" },
      isError: false,
      error: null,
    } as ReturnType<typeof useOwnUser>);

    renderWithQueryClient(<ProfilePage />);

    expect(screen.getByText("@alex")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preview Profile Link" })).toHaveAttribute(
      "href",
      "/@alex",
    );
    expect(
      screen.getByRole("link", { name: 'Preview "Foster Me" Link' }),
    ).toHaveAttribute("href", "/@alex/foster-me");
    expect(screen.getByText("/@alex/foster-me")).toBeInTheDocument();
  });

  it("shows location and shelters read-only, without a key/value list", () => {
    renderWithQueryClient(<ProfilePage />);

    expect(screen.getByText("Austin, TX")).toBeInTheDocument();
    expect(screen.getByText("Austin Pets Alive")).toBeInTheDocument();
    expect(screen.queryByRole("term")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("ZIP code")).not.toBeInTheDocument();
  });

  it("lists connected sites by label beside the location card and manages them from there", async () => {
    renderWithQueryClient(<ProfilePage />);

    expect(screen.getByText("Where you share")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://example.com/alex",
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Manage where you share" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByDisplayValue("Instagram")).toBeInTheDocument();
    // Location/shelters and the name/bio dialog stay closed.
    expect(screen.queryByLabelText("Display name")).not.toBeInTheDocument();
  });

  it("shows a placeholder when no sites are connected", () => {
    vi.mocked(useOwnUser).mockReturnValue({
      data: { ...profile, socialLinks: [] },
      isError: false,
      error: null,
    } as ReturnType<typeof useOwnUser>);

    renderWithQueryClient(<ProfilePage />);

    expect(screen.getByText("No places listed yet.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Instagram" })).not.toBeInTheDocument();
  });

  it("opens the name/handle/bio dialog without location fields", async () => {
    renderWithQueryClient(<ProfilePage />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit name and bio" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText("Display name")).toHaveValue("Alex Foster");
    expect(screen.getByLabelText("Handle")).toHaveValue("");
    expect(screen.getByLabelText("Bio (markdown)")).toHaveValue("Fostering since 2019");
    expect(screen.queryByLabelText("ZIP code")).not.toBeInTheDocument();
  });

  it("opens the name and bio editor from Read more when the bio is too many lines", async () => {
    const bio = Array.from(
      { length: BIO_PREVIEW_MAX_LINES + 1 },
      (_, i) => `Editor line ${i + 1}.`,
    ).join("\n");
    vi.mocked(useOwnUser).mockReturnValue({
      data: { ...profile, bio },
      isError: false,
      error: null,
    } as ReturnType<typeof useOwnUser>);

    renderWithQueryClient(<ProfilePage />);

    fireEvent.click(screen.getByRole("button", { name: "Read more..." }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Edit name & bio" })).toBeInTheDocument();
    expect(screen.getByLabelText("Bio (markdown)")).toHaveValue(bio);
    expect(screen.queryByText("About this foster")).not.toBeInTheDocument();
  });

  it("opens location and shelters in a dialog", async () => {
    renderWithQueryClient(<ProfilePage />);

    fireEvent.click(screen.getByRole("button", { name: "Edit location and shelters" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText("ZIP code")).toHaveValue("78701");
  });

  it("shows an empty state with a call to action when there are no pets", async () => {
    renderWithQueryClient(<ProfilePage />);

    expect(screen.getByText("No pets yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /add your first pet/i })).toHaveAttribute(
      "href",
      "/profile/pets/new",
    );
    expect(screen.queryByRole("form", { name: "Add pet" })).not.toBeInTheDocument();
  });

  it("lists pets as clickable photo cards and links to the pet editor page", () => {
    const listed: PetPublic = {
      id: "pet-1",
      ownerId: "u1",
      owner: null,
      name: "Fido",
      species: "dog",
      breed: "Husky",
      ageValue: 3,
      ageUnit: "years",
      sex: "male",
      size: "large",
      status: "actively_fostering",
      subStatus: null,
      shelterLinkName: null,
      shelterLinkUrl: null,
      primaryPhotoUrl: "https://cdn.example.com/fido.jpg",
      bioMarkdown: null,
      importantLinks: [],
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      meta: { title: "Fido", description: "", imageUrl: null },
      updates: [],
    };
    vi.mocked(useOwnerPets).mockReturnValue({
      data: [listed],
      isLoading: false,
    } as ReturnType<typeof useOwnerPets>);

    renderWithQueryClient(<ProfilePage />);

    expect(screen.getByRole("link", { name: "Fido" })).toHaveAttribute(
      "href",
      "/@u1/pet/pet-1",
    );
    expect(screen.getByText(/actively fostering/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Age: 3 years")).toBeInTheDocument();
    expect(screen.getByText("Husky")).toBeInTheDocument();
    expect(screen.queryByText("dog")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view bio/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/profile/pets/edit?petId=pet-1",
    );
    expect(screen.getByRole("link", { name: "Add pet" })).toHaveAttribute(
      "href",
      "/profile/pets/new",
    );
    expect(screen.queryByRole("form", { name: "Edit Fido" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fido" })).toHaveAttribute(
      "href",
      "/@u1/pet/pet-1",
    );
  });
});
