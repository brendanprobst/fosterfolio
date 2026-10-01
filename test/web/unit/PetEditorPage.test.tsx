import { useAuth, useRequireAuth } from "@client/auth";
import { usePet, type PetPublic } from "@client/features/pets";
import { PetEditorPage } from "@client/pages/profile";
import { fireEvent, screen } from "@testing-library/react";
import { useRouter, useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authSignedIn, renderWithQueryClient } from "./support/renderWithProviders";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
  useRequireAuth: vi.fn(),
}));

const push = vi.fn();
const search = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/profile/pets/edit"),
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("@client/features/pets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/pets")>();
  return {
    ...actual,
    usePet: vi.fn(),
    useCreatePetMutation: () => ({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    }),
    useUpdatePetMutation: () => ({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    }),
    useDeletePetMutation: () => ({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    }),
  };
});

vi.mock("@client/features/storage", () => ({
  useMediaUpload: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));

vi.mock("@client/features/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/users")>();
  return {
    ...actual,
    useOwnUser: () => ({ data: null, isLoading: false, isError: false, error: null }),
    useUpdateUserMutation: () => ({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    }),
  };
});

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
  primaryPhotoUrl: null,
  photos: [],
  bioMarkdown: null,
  importantLinks: [],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  meta: { title: "Fido", description: "", imageUrl: null },
  updates: [],
};

describe("PetEditorPage", () => {
  beforeEach(() => {
    search.delete("petId");
    search.delete("from");
    push.mockReset();
    vi.mocked(useAuth).mockReturnValue(authSignedIn());
    vi.mocked(useRequireAuth).mockReturnValue({
      user: authSignedIn().user,
      loading: false,
      apiAuthAccepted: true,
    } as ReturnType<typeof useRequireAuth>);
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(useSearchParams).mockReturnValue(search as unknown as ReturnType<typeof useSearchParams>);
    vi.mocked(usePet).mockReturnValue({
      data: listed,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePet>);
  });

  it("renders the add-pet form on the create page", () => {
    renderWithQueryClient(<PetEditorPage mode="create" />);

    expect(screen.getByRole("heading", { name: "Add a pet" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Add pet" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(push).toHaveBeenCalledWith("/profile");
  });

  it("loads the pet on the edit page and returns to from", () => {
    search.set("petId", "pet-1");
    search.set("from", "/@u1/pet/pet-1");

    renderWithQueryClient(<PetEditorPage mode="edit" />);

    expect(screen.getByRole("heading", { name: "Edit Fido" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Edit Fido" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Fido");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(push).toHaveBeenCalledWith("/@u1/pet/pet-1");
  });

  it("refuses to edit someone else's pet", () => {
    search.set("petId", "pet-1");
    vi.mocked(usePet).mockReturnValue({
      data: { ...listed, ownerId: "other" },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePet>);

    renderWithQueryClient(<PetEditorPage mode="edit" />);

    expect(screen.getByText("You can only edit your own pets.")).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Edit Fido" })).not.toBeInTheDocument();
  });
});
