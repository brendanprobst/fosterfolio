import { selectActiveFosters, selectFosterMePet } from "@client/lib/selectFosterMePet";
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

describe("selectActiveFosters", () => {
  it("returns every actively fostering pet, newest first", () => {
    const pets = [
      { id: "newer-adopted", status: "adopted" },
      { id: "newer-active", status: "actively_fostering" },
      { id: "older-active", status: "actively_fostering" },
    ];
    expect(selectActiveFosters(pets).map((pet) => pet.id)).toEqual([
      "newer-active",
      "older-active",
    ]);
  });

  it("returns an empty list when none are actively fostering", () => {
    expect(selectActiveFosters([{ id: "adopted", status: "adopted" }])).toEqual([]);
  });
});
