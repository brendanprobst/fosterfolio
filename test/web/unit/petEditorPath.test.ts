import {
  petEditorEditHref,
  petEditorNewHref,
  petEditorReturnPath,
} from "@client/lib/petEditorPath";
import { describe, expect, it } from "vitest";

describe("petEditorPath", () => {
  it("builds the create URL without a from query when returning to profile", () => {
    expect(petEditorNewHref()).toBe("/profile/pets/new");
    expect(petEditorNewHref("/profile")).toBe("/profile/pets/new");
  });

  it("keeps a return path on create when the user started elsewhere", () => {
    expect(petEditorNewHref("/@alex/foster-me")).toBe(
      "/profile/pets/new?from=%2F%40alex%2Ffoster-me",
    );
  });

  it("puts the pet id on the edit query string", () => {
    expect(petEditorEditHref("pet-1")).toBe("/profile/pets/edit?petId=pet-1");
    expect(petEditorEditHref("pet-1", "/@alex/pet/pet-1")).toBe(
      "/profile/pets/edit?petId=pet-1&from=%2F%40alex%2Fpet%2Fpet-1",
    );
  });

  it("defaults return to /profile and rejects open redirects", () => {
    expect(petEditorReturnPath(null)).toBe("/profile");
    expect(petEditorReturnPath("/@alex/pet/pet-1")).toBe("/@alex/pet/pet-1");
    expect(petEditorReturnPath("https://evil.example")).toBe("/profile");
  });
});
