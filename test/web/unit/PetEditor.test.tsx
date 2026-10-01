import { useAuth } from "@client/auth";
import type { PetPublic } from "@client/features/pets";
import { useCreatePetMutation, useUpdatePetMutation } from "@client/features/pets";
import { useMediaUpload } from "@client/features/storage";
import { useOwnUser, useUpdateUserMutation } from "@client/features/users";
import type { UserOwner } from "@client/features/users";
import { serializeShelterLinks } from "@client/lib/shelterLinks";
import { PetEditor } from "@client/pages/profile";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authSignedIn, renderWithQueryClient } from "./support/renderWithProviders";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@client/features/pets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/pets")>();
  return {
    ...actual,
    useCreatePetMutation: vi.fn(),
    useUpdatePetMutation: vi.fn(),
    useDeletePetMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  };
});

vi.mock("@client/features/storage", () => ({
  useMediaUpload: vi.fn(),
}));

vi.mock("@client/features/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/users")>();
  return { ...actual, useOwnUser: vi.fn(), useUpdateUserMutation: vi.fn() };
});

const owner: UserOwner = {
  id: "u1",
  handle: null,
  email: "you@example.com",
  displayName: "Alex Foster",
  avatarUrl: null,
  bio: null,
  city: "Austin",
  state: "TX",
  zipCode: "78701",
  lat: null,
  lng: null,
  sheltersText: JSON.stringify([
    { name: "SFACC", url: "https://sfacc.example" },
    { name: "Muttville", url: "https://muttville.example" },
  ]),
  socialLinks: [],
  starCount: 0,
  createdAt: "2026-08-01T00:00:00.000Z",
};

const createMutate = vi.fn();
const updateMutate = vi.fn();
const uploadMutate = vi.fn();
const updateUserMutate = vi.fn();

describe("PetEditor", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authSignedIn());
    vi.mocked(useOwnUser).mockReturnValue({
      data: owner,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useOwnUser>);
    vi.mocked(useCreatePetMutation).mockReturnValue({
      mutate: createMutate,
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useCreatePetMutation>);
    vi.mocked(useUpdatePetMutation).mockReturnValue({
      mutate: updateMutate,
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useUpdatePetMutation>);
    vi.mocked(useMediaUpload).mockReturnValue({
      mutateAsync: uploadMutate,
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useMediaUpload>);
    vi.mocked(useUpdateUserMutation).mockReturnValue({
      mutate: updateUserMutate,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useUpdateUserMutation>);
    createMutate.mockReset();
    updateMutate.mockReset();
    uploadMutate.mockReset();
    updateUserMutate.mockReset();
    uploadMutate.mockResolvedValue({ publicUrl: "https://cdn.example.com/p.jpg" });
  });

  it("uses a segmented age-unit control", () => {
    renderWithQueryClient(<PetEditor pet={null} onClose={vi.fn()} />);

    expect(screen.getByRole("radiogroup", { name: "Age unit" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Years" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Months" }));
    expect(screen.getByRole("radio", { name: "Months" })).toHaveAttribute("aria-checked", "true");
  });

  it("uses a segmented sex control that includes Unsure", () => {
    renderWithQueryClient(<PetEditor pet={null} onClose={vi.fn()} />);

    expect(screen.getByRole("radiogroup", { name: "Sex" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Unsure" })).toHaveAttribute("aria-checked", "false");
    fireEvent.click(screen.getByRole("radio", { name: "Unsure" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Nova" } });
    fireEvent.submit(screen.getByRole("form", { name: "Add pet" }));

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Nova", sex: "unsure" }),
      expect.any(Object),
    );
  });

  it("removes an existing photo without a page reload", async () => {
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

    renderWithQueryClient(<PetEditor pet={listed} onClose={vi.fn()} />);

    expect(screen.getByRole("img", { name: "Current pet photo" })).toHaveAttribute(
      "src",
      "https://cdn.example.com/fido.jpg",
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(screen.queryByRole("img", { name: "Current pet photo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove photo" })).not.toBeInTheDocument();

    fireEvent.submit(screen.getByRole("form", { name: "Edit Fido" }));
    expect(updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "pet-1",
        payload: expect.objectContaining({ primaryPhotoUrl: null }),
      }),
      expect.any(Object),
    );
  });

  it("uploads a dropped image onto the photo drop area", async () => {
    renderWithQueryClient(<PetEditor pet={null} onClose={vi.fn()} />);

    const drop = screen.getByLabelText("Photo drop area");
    const file = new File(["img"], "dog.png", { type: "image/png" });
    fireEvent.drop(drop, {
      dataTransfer: { files: [file], types: ["Files"] },
    });

    await waitFor(() => {
      expect(uploadMutate).toHaveBeenCalledWith(file);
    });
  });

  it("uploads an image from the clipboard and rejects a clipboard with no photo", async () => {
    const png = new File(["img"], "clip.png", { type: "image/png" });
    const read = vi.fn().mockResolvedValue([
      {
        types: ["image/png"],
        getType: async () => png,
      },
    ]);
    Object.assign(navigator, { clipboard: { read } });

    renderWithQueryClient(<PetEditor pet={null} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Upload from clipboard" }));
    await waitFor(() => expect(uploadMutate).toHaveBeenCalled());

    read.mockResolvedValue([{ types: ["text/plain"], getType: async () => new Blob(["hi"]) }]);
    fireEvent.click(screen.getByRole("button", { name: "Upload from clipboard" }));
    expect(await screen.findByText(/no image on the clipboard/i)).toBeInTheDocument();
  });

  it("lets the foster pick a saved shelter or add one in a dialog", () => {
    renderWithQueryClient(<PetEditor pet={null} onClose={vi.fn()} />);

    expect(screen.queryByLabelText("Shelter URL")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /SFACC/ }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Nova" } });
    fireEvent.submit(screen.getByRole("form", { name: "Add pet" }));

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Nova",
        shelterLinkName: "SFACC",
        shelterLinkUrl: "https://sfacc.example",
      }),
      expect.any(Object),
    );

    fireEvent.click(screen.getByRole("button", { name: /add a shelter manually/i }));
    fireEvent.change(screen.getByLabelText("Shelter name"), { target: { value: "APA" } });
    fireEvent.change(screen.getByLabelText("Website"), {
      target: { value: "https://apa.example" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Add shelter" }));

    expect(updateUserMutate).toHaveBeenCalledWith(
      {
        id: "u1",
        payload: {
          sheltersText: serializeShelterLinks([
            { name: "SFACC", url: "https://sfacc.example" },
            { name: "Muttville", url: "https://muttville.example" },
            { name: "APA", url: "https://apa.example" },
          ]),
        },
      },
      expect.any(Object),
    );
  });

  it("gives create more weight than cancel in the footer", () => {
    renderWithQueryClient(<PetEditor pet={null} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Create pet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
