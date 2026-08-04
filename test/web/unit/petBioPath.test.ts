import { PET_BIO_SENTINEL_ID } from "@client/lib/constants/petBioSentinel";
import { petIdFromPathname } from "@client/lib/petBioPath";
import { describe, expect, it } from "vitest";

describe("petIdFromPathname", () => {
  it("reads a real pet id from /pets/{id}", () => {
    expect(
      petIdFromPathname("/pets/11111111-1111-1111-1111-111111111111"),
    ).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("normalizes static-export .html pathnames", () => {
    expect(
      petIdFromPathname("/pets/11111111-1111-1111-1111-111111111111.html"),
    ).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("returns null for the sentinel placeholder", () => {
    expect(petIdFromPathname(`/pets/${PET_BIO_SENTINEL_ID}`)).toBeNull();
  });

  it("returns null for unrelated paths", () => {
    expect(petIdFromPathname("/profile")).toBeNull();
    expect(petIdFromPathname("/pets")).toBeNull();
  });
});
