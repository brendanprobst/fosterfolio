import { PET_BIO_SENTINEL_ID } from "@client/lib/constants/petBioSentinel";
import { petHref, petIdFromPathname } from "@client/lib/petBioPath";
import { describe, expect, it } from "vitest";

describe("pet paths", () => {
  it("builds /@owner/pet/{id}", () => {
    expect(petHref("brendan", "pet-1")).toBe("/@brendan/pet/pet-1");
    expect(petHref("@brendan", "pet-1")).toBe("/@brendan/pet/pet-1");
  });

  it("reads a real pet id from /@handle/pet/{id}", () => {
    expect(
      petIdFromPathname("/@owner-1/pet/11111111-1111-1111-1111-111111111111"),
    ).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("normalizes static-export .html pathnames", () => {
    expect(
      petIdFromPathname(
        "/@owner-1/pet/11111111-1111-1111-1111-111111111111.html",
      ),
    ).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("returns null for the sentinel placeholder", () => {
    expect(
      petIdFromPathname(`/@${PET_BIO_SENTINEL_ID}/pet/${PET_BIO_SENTINEL_ID}`),
    ).toBeNull();
  });

  it("returns null for unrelated paths", () => {
    expect(petIdFromPathname("/profile")).toBeNull();
    expect(petIdFromPathname("/@brendan")).toBeNull();
    expect(petIdFromPathname("/@brendan/foster-me")).toBeNull();
  });
});
