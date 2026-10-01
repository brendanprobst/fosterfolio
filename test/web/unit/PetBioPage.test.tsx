import { useAuth } from "@client/auth";
import { usePet } from "@client/features/pets";
import { petEditorEditHref } from "@client/lib/petEditorPath";
import type { PetPublic } from "@client/features/pets";
import { PetBioPage } from "@client/pages/pets";
import { fireEvent, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
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
}));

vi.mock("@client/features/pets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/pets")>();
  return {
    ...actual,
    usePet: vi.fn(),
  };
});

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qq"),
  },
}));

const petId = "11111111-1111-1111-1111-111111111111";

const pet: PetPublic = {
  id: petId,
  ownerId: "owner-1",
  owner: {
    id: "owner-1",
    handle: null,
    displayName: "Alex Foster",
    avatarUrl: null,
  },
  name: "Mochi",
  species: "dog",
  breed: "mutt",
  ageValue: 2,
  ageUnit: "years",
  sex: "male",
  size: "medium",
  status: "actively_fostering",
  subStatus: null,
  shelterLinkName: null,
  shelterLinkUrl: null,
  primaryPhotoUrl: null,
  photos: [],
  bioMarkdown: "A very good boy",
  importantLinks: [],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  meta: {
    title: "Mochi · Fosterfolio",
    description: "A very good boy",
    imageUrl: null,
  },
  updates: [],
};

describe("PetBioPage", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authLoggedOut());
    vi.mocked(usePathname).mockReturnValue(`/@owner-1/pet/${petId}`);
    document.title = "Fosterfolio";
  });

  it("sets document.title from meta and shows a guest sidebar without a pet QR", () => {
    vi.mocked(usePet).mockReturnValue({
      data: pet,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePet>);

    renderWithQueryClient(<PetBioPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Mochi" })).toBeInTheDocument();
    expect(screen.getByText("actively fostering")).toBeInTheDocument();
    expect(screen.getByLabelText("Age: 2 years")).toBeInTheDocument();
    expect(screen.getByLabelText("Weight: medium")).toBeInTheDocument();
    expect(screen.getByLabelText("Gender: male")).toBeInTheDocument();
    expect(screen.getByText("mutt")).toBeInTheDocument();
    expect(screen.queryByText("dog")).not.toBeInTheDocument();
    expect(screen.getByText(/interested in mochi/i)).toBeInTheDocument();
    expect(screen.getByText("Fostered by")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alex Foster" })).toHaveAttribute(
      "href",
      "/@owner-1",
    );
    expect(screen.getByText("Actively fostering Mochi")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /see who they’re fostering now/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Contact the foster" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Contact the foster" }).closest("[data-slot=card-content]")).toHaveClass(
      "hidden",
      "lg:block",
    );
    expect(screen.getByRole("button", { name: "Expand" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "QR code" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /QR code/i })).not.toBeInTheDocument();
    expect(document.title).toBe("Mochi · Fosterfolio");
  });

  it("warns when the viewed pet is no longer the active foster", () => {
    vi.mocked(usePet).mockReturnValue({
      data: { ...pet, status: "adopted" },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePet>);

    renderWithQueryClient(<PetBioPage />);

    expect(screen.queryByText("Actively fostering Mochi")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      /isn’t actively fostered by Alex Foster/i,
    );
    expect(
      screen.getByRole("link", { name: /see who they’re fostering now/i }),
    ).toHaveAttribute("href", "/@owner-1/foster-me");
    expect(screen.getByRole("form", { name: "Contact the foster" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand" })).toBeInTheDocument();
  });

  it("expands the inquiry form into a modal and keeps in-progress values", () => {
    vi.mocked(usePet).mockReturnValue({
      data: pet,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePet>);

    renderWithQueryClient(<PetBioPage />);

    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: "Jamie" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Expand" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toHaveValue("Jamie");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toHaveValue("Jamie");
  });

  it("hides the pet QR from a signed-in visitor who does not own the pet", () => {
    vi.mocked(useAuth).mockReturnValue(
      authSignedIn({ id: "visitor-9", email: "visitor@example.com" } as User),
    );
    vi.mocked(usePet).mockReturnValue({
      data: pet,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePet>);

    renderWithQueryClient(<PetBioPage />);

    expect(screen.getByText(/interested in mochi/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "QR code" })).not.toBeInTheDocument();
    expect(screen.queryByText("Share this bio")).not.toBeInTheDocument();
  });

  it("lets the owning foster generate a pet QR on demand", async () => {
    vi.mocked(useAuth).mockReturnValue(
      authSignedIn({ id: "owner-1", email: "alex@example.com" } as User),
    );
    vi.mocked(usePet).mockReturnValue({
      data: pet,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof usePet>);

    renderWithQueryClient(<PetBioPage />);

    expect(screen.getByText("Edit Mochi's bio")).toBeInTheDocument();
    expect(screen.getAllByText("Visible only to you")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Edit bio" })).toHaveAttribute(
      "href",
      petEditorEditHref(petId, `/@owner-1/pet/${petId}`),
    );
    expect(
      screen.queryByRole("link", { name: /view your public profile/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /QR code/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "QR code" }));
    expect(await screen.findByRole("button", { name: /download png/i })).toBeInTheDocument();
  });
});
