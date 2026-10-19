import { useAuth, useRequireAuth } from "@client/auth";
import { BIO_PREVIEW_MAX_LINES } from "@client/lib/bioPreview";
import { useOwnerPets, type PetPublic } from "@client/features/pets";
import { useOwnUser, useUpdateUserMutation } from "@client/features/users";
import type { UserOwner } from "@client/features/users";
import { ProfilePage } from "@client/pages/profile";
import { fireEvent, screen, within } from "@testing-library/react";
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

  it("leads with the identity header and keeps link sharing off the profile page", () => {
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
    const tools = screen.getByRole("region", { name: "Your tools" });
    const addPet = within(tools).getByRole("link", { name: "Add pet" });
    expect(addPet).toHaveAttribute("href", "/profile/pets/new");
    expect(within(tools).getByRole("link", { name: "Links & QR codes" })).toHaveAttribute(
      "href",
      "/profile/links",
    );
    expect(
      screen.getByText(/no handle yet — public links use a random address/i),
    ).toBeInTheDocument();
    // Sharing and QR codes live on the links page and each pet's page, not here.
    expect(screen.queryByText("Sharing your profile")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /QR code/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy .* link/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /QR code/i })).not.toBeInTheDocument();
  });

  it("shows a claimed handle", () => {
    vi.mocked(useOwnUser).mockReturnValue({
      data: { ...profile, handle: "alex" },
      isError: false,
      error: null,
    } as ReturnType<typeof useOwnUser>);

    renderWithQueryClient(<ProfilePage />);

    expect(screen.getByText("@alex")).toBeInTheDocument();
  });

  it("shows location and shelters read-only, without a key/value list", () => {
    renderWithQueryClient(<ProfilePage />);

    expect(screen.getByText("Austin, TX")).toBeInTheDocument();
    expect(screen.getByText("Austin Pets Alive")).toBeInTheDocument();
    expect(screen.queryByText(/help find adopters in your area/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("term")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("ZIP code")).not.toBeInTheDocument();
  });

  it("lists connected sites by label beside the location card and manages them from there", async () => {
    renderWithQueryClient(<ProfilePage />);

    expect(screen.getByText("Where you share")).toBeInTheDocument();
    expect(screen.queryByText(/anywhere you post/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://example.com/alex",
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Manage where you share" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/anywhere you post/i)).toBeInTheDocument();
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

  it("opens picture, name, handle, and bio in one dialog without location fields", async () => {
    renderWithQueryClient(<ProfilePage />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit profile picture" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Edit profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add image" })).toBeInTheDocument();
    expect(screen.getByLabelText("Display name")).toHaveValue("Alex Foster");
    expect(screen.getByLabelText("Handle")).toHaveValue("");
    expect(await screen.findByRole("textbox", { name: "Bio" })).toHaveTextContent(
      "Fostering since 2019",
    );
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
    expect(screen.getByRole("heading", { name: "Edit profile" })).toBeInTheDocument();
    const bioEditor = await screen.findByRole("textbox", { name: "Bio" });
    expect(bioEditor).toHaveTextContent("Editor line 1.");
    expect(bioEditor).toHaveTextContent(`Editor line ${BIO_PREVIEW_MAX_LINES + 1}.`);
    expect(screen.queryByText("About this foster")).not.toBeInTheDocument();
  });

  it("opens location and shelters in a dialog", async () => {
    renderWithQueryClient(<ProfilePage />);

    fireEvent.click(screen.getByRole("button", { name: "Edit location and shelters" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText("ZIP code")).toHaveValue("78701");
    expect(screen.getByText(/help find adopters in your area/i)).toBeInTheDocument();
  });

  it("shows a profile skeleton instead of the empty state while data is loading", () => {
    vi.mocked(useOwnUser).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof useOwnUser>);
    vi.mocked(useOwnerPets).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useOwnerPets>);

    renderWithQueryClient(<ProfilePage />);

    expect(screen.getByRole("status", { name: "Loading profile" })).toBeInTheDocument();
    expect(screen.queryByText("Add your name")).not.toBeInTheDocument();
    expect(screen.queryByText("No pets yet")).not.toBeInTheDocument();
  });

  it("shows an empty state with a call to action when there are no pets", async () => {
    renderWithQueryClient(<ProfilePage />);

    expect(
      within(screen.getByRole("region", { name: "Currently fostering" })).getByText("No pets yet"),
    ).toBeInTheDocument();
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
      photos: [],
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
    expect(
      within(screen.getByRole("region", { name: "Your tools" })).getByRole("link", {
        name: "Add pet",
      }),
    ).toHaveAttribute("href", "/profile/pets/new");
    expect(screen.queryByRole("form", { name: "Edit Fido" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fido" })).toHaveAttribute(
      "href",
      "/@u1/pet/pet-1",
    );
  });

  it("lists current fosters above past fosters, with Add pet in the hero", () => {
    const listed = {
      id: "pet-active",
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
      primaryPhotoUrl: null,
      photos: [],
      bioMarkdown: null,
      importantLinks: [],
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      meta: { title: "Fido", description: "", imageUrl: null },
      updates: [],
    } satisfies PetPublic;
    vi.mocked(useOwnerPets).mockReturnValue({
      data: [
        listed,
        { ...listed, id: "pet-past", name: "Nori", status: "adopted" },
      ],
      isLoading: false,
    } as ReturnType<typeof useOwnerPets>);

    renderWithQueryClient(<ProfilePage />);

    const tools = screen.getByRole("region", { name: "Your tools" });
    const current = within(tools).getByRole("region", { name: "Currently fostering" });
    const pastSection = screen.getByRole("region", { name: "Past fosters" });
    expect(within(tools).getByRole("region", { name: "Your details" })).toBeInTheDocument();
    expect(within(tools).queryByRole("region", { name: "Past fosters" })).not.toBeInTheDocument();
    expect(within(tools).getByRole("link", { name: "Add pet" })).toHaveAttribute(
      "href",
      "/profile/pets/new",
    );
    expect(current.compareDocumentPosition(pastSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(within(current).getByRole("link", { name: "Fido" })).toHaveAttribute(
      "href",
      "/@u1/pet/pet-active",
    );
    expect(within(pastSection).getByRole("link", { name: "Nori" })).toHaveAttribute(
      "href",
      "/@u1/pet/pet-past",
    );
    expect(within(pastSection).getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/profile/pets/edit?petId=pet-past",
    );
    expect(within(current).queryByRole("link", { name: "Nori" })).not.toBeInTheDocument();
  });
});
