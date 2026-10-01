import { PetCard } from "@client/components/PetCard";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const pet = {
  id: "pet-1",
  name: "Fido",
  species: "dog",
  breed: "Husky",
  status: "actively_fostering",
  primaryPhotoUrl: "https://cdn.example.com/fido.jpg",
  ageValue: 2,
  ageUnit: "years",
  sex: "male",
  size: "medium",
};

describe("PetCard", () => {
  it("ranks name and status, then icon pills, then breed as soft text", () => {
    render(<PetCard pet={pet} href="/@u1/pet/pet-1" />);

    expect(screen.getByRole("link", { name: "Fido" })).toHaveAttribute(
      "href",
      "/@u1/pet/pet-1",
    );
    expect(screen.getByText("actively fostering")).toBeInTheDocument();
    expect(screen.getByLabelText("Age: 2 years")).toBeInTheDocument();
    expect(screen.getByLabelText("Weight: medium")).toBeInTheDocument();
    expect(screen.getByLabelText("Gender: male")).toBeInTheDocument();
    expect(screen.getByText("Husky")).toBeInTheDocument();
    expect(screen.queryByText("dog")).not.toBeInTheDocument();
  });

  it("shows an unsure sex as a gender pill", () => {
    render(<PetCard pet={{ ...pet, sex: "unsure" }} href="/@u1/pet/pet-1" />);

    expect(screen.getByLabelText("Gender: unsure")).toBeInTheDocument();
  });

  it("keeps overlay actions outside the bio link", () => {
    const onEdit = vi.fn();
    render(
      <PetCard
        pet={pet}
        href="/@u1/pet/pet-1"
        actions={
          <button type="button" onClick={onEdit}>
            Edit
          </button>
        }
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Edit" }).closest("a")).toBeNull();
  });
});
