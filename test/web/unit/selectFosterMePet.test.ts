import { selectFosterMePet } from "@client/lib/selectFosterMePet";
import { describe, expect, it } from "vitest";

describe("selectFosterMePet", () => {
  it("prefers the most recent actively_fostering pet", () => {
    const pets = [
      { id: "newer-adopted", status: "adopted" },
      { id: "active", status: "actively_fostering" },
      { id: "older-active", status: "actively_fostering" },
    ];
    expect(selectFosterMePet(pets)).toEqual({
      kind: "active",
      pet: pets[1],
    });
  });

  it("falls back to the most recent pet when none are actively fostering", () => {
    const pets = [
      { id: "latest", status: "adopted" },
      { id: "older", status: "available" },
    ];
    expect(selectFosterMePet(pets)).toEqual({
      kind: "fallback",
      pet: pets[0],
    });
  });

  it("returns empty when there are no pets", () => {
    expect(selectFosterMePet([])).toEqual({ kind: "empty" });
  });
});
