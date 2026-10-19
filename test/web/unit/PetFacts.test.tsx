import { PetFacts } from "@client/components/PetFacts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

const pet = {
  status: "actively_fostering",
  subStatus: "adoptable",
  ageValue: 2,
  ageUnit: "years",
  sex: "female",
  size: "18 lb",
  breed: "Tabby",
  species: "cat",
};

describe("PetFacts", () => {
  it("renders the title, status, and details together by default", () => {
    render(<PetFacts pet={pet} title={<h1>Miso</h1>} showSpecies />);

    expect(screen.getByRole("heading", { name: "Miso" })).toBeInTheDocument();
    expect(screen.getByText("actively fostering")).toBeInTheDocument();
    expect(screen.getByText("adoptable")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Details" })).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, node) =>
          node?.tagName === "P" && node.textContent === "cat · Tabby",
      ),
    ).toBeInTheDocument();
  });

  it("renders only the title and status badges for the header part", () => {
    render(
      <PetFacts pet={pet} part="header" title={<h1>Miso</h1>} showSpecies />,
    );

    expect(screen.getByRole("heading", { name: "Miso" })).toBeInTheDocument();
    expect(screen.getByText("actively fostering")).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Details" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Tabby")).not.toBeInTheDocument();
  });

  it("renders only the details list for the details part", () => {
    render(<PetFacts pet={pet} part="details" showSpecies />);

    expect(
      screen.queryByRole("heading", { name: "Miso" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("actively fostering")).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByLabelText("Age: 2 years")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, node) =>
          node?.tagName === "P" && node.textContent === "cat · Tabby",
      ),
    ).toBeInTheDocument();
  });
});
