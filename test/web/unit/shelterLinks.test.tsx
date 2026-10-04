import {
  parseShelterLinks,
  serializeShelterLinks,
} from "@client/lib/shelterLinks";
import { describe, expect, it } from "vitest";

describe("shelterLinks", () => {
  it("treats a legacy free-text value as a single name-only row", () => {
    expect(parseShelterLinks("Austin Pets Alive")).toEqual([
      { name: "Austin Pets Alive", url: "" },
    ]);
  });

  it("reads a JSON array of name/url pairs", () => {
    expect(
      parseShelterLinks(
        JSON.stringify([
          { name: "SFACC", url: "https://sfacc.example" },
          { name: "Muttville", url: "" },
        ]),
      ),
    ).toEqual([
      { name: "SFACC", url: "https://sfacc.example" },
      { name: "Muttville", url: "" },
    ]);
  });

  it("accepts label as an alias for name", () => {
    expect(parseShelterLinks('[{"label":"APA","url":"https://apa.example"}]')).toEqual([
      { name: "APA", url: "https://apa.example" },
    ]);
  });

  it("serializes filled rows back to JSON text, dropping blanks", () => {
    expect(
      serializeShelterLinks([
        { name: "SFACC", url: "https://sfacc.example" },
        { name: "  ", url: "https://ignored.example" },
        { name: "Muttville", url: "" },
      ]),
    ).toBe(
      JSON.stringify([
        { name: "SFACC", url: "https://sfacc.example" },
        { name: "Muttville", url: "" },
      ]),
    );
  });

  it("serializes an empty list to null", () => {
    expect(serializeShelterLinks([])).toBeNull();
  });
});
