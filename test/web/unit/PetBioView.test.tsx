import type { PetPublic } from "@client/features/pets";
import { PetBioView } from "@client/pages/pets/PetBioView";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

function pet(overrides: Partial<PetPublic> = {}): PetPublic {
  return {
    id: "pet-1",
    ownerId: "owner-1",
    owner: null,
    name: "Mochi",
    species: "dog",
    breed: "Husky",
    ageValue: 1,
    ageUnit: "months",
    sex: "female",
    size: "28 lb",
    status: "actively_fostering",
    subStatus: null,
    shelterLinkName: null,
    shelterLinkUrl: null,
    primaryPhotoUrl: "https://cdn.example.com/cover.jpg",
    photos: [
      { url: "https://cdn.example.com/cover.jpg" },
      { url: "https://cdn.example.com/second.jpg" },
    ],
    bioMarkdown: null,
    importantLinks: [],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    meta: { title: "Mochi · Fosterfolio", description: "", imageUrl: null },
    updates: [],
    ...overrides,
  };
}

describe("PetBioView", () => {
  it("shows species with breed, a singular age, and the weight as typed", () => {
    render(<PetBioView pet={pet()} />);

    expect(
      screen.getByText((_, node) => node?.tagName === "P" && node.textContent === "dog · Husky"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Age: 1 month")).toBeInTheDocument();
    expect(screen.getByLabelText("Weight: 28 lb")).toBeInTheDocument();
  });

  it("opens on the cover and swaps the main photo from a thumbnail", () => {
    render(
      <PetBioView
        pet={pet({
          primaryPhotoUrl: "https://cdn.example.com/cover.jpg",
          photos: [
            { url: "https://cdn.example.com/second.jpg" },
            { url: "https://cdn.example.com/cover.jpg" },
          ],
        })}
      />,
    );

    const main = screen.getByRole("img", { name: "Mochi" });
    expect(main).toHaveAttribute("src", "https://cdn.example.com/cover.jpg");

    fireEvent.click(screen.getByRole("button", { name: "Show photo 2" }));
    expect(screen.getByRole("img", { name: "Mochi" })).toHaveAttribute(
      "src",
      "https://cdn.example.com/second.jpg",
    );
  });

  it("keeps a single primary URL as one photo with no thumbnail strip", () => {
    render(
      <PetBioView
        pet={pet({
          primaryPhotoUrl: "https://cdn.example.com/only.jpg",
          photos: [],
        })}
      />,
    );

    expect(screen.getByRole("img", { name: "Mochi" })).toHaveAttribute(
      "src",
      "https://cdn.example.com/only.jpg",
    );
    expect(screen.queryByRole("list", { name: "Photos" })).not.toBeInTheDocument();
  });

  it("shows a placeholder when the pet has no photos", () => {
    render(<PetBioView pet={pet({ primaryPhotoUrl: null, photos: [] })} />);

    expect(screen.queryByRole("img", { name: "Mochi" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mochi" })).toBeInTheDocument();
  });
});
