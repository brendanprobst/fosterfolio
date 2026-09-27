import { USER_PROFILE_SENTINEL_ID } from "@client/lib/constants/userProfileSentinel";
import {
  fosterMeHref,
  handleFromPathname,
  handleHref,
  normalizeHandleInput,
  publicHandle,
  userProfileHref,
} from "@client/lib/userProfilePath";
import { describe, expect, it } from "vitest";

describe("handle paths", () => {
  it("builds /@handle URLs and strips a leading @", () => {
    expect(handleHref("brendan")).toBe("/@brendan");
    expect(handleHref("@brendan")).toBe("/@brendan");
    expect(userProfileHref("abc")).toBe("/@abc");
    expect(fosterMeHref("brendan")).toBe("/@brendan/foster-me");
  });

  it("normalizes handle input the same way the API stores it", () => {
    expect(normalizeHandleInput(" Brendan ")).toBe("brendan");
    expect(normalizeHandleInput("@Brendan")).toBe("brendan");
    expect(normalizeHandleInput("")).toBe("");
  });

  it("prefers a claimed handle over the uuid", () => {
    expect(publicHandle({ id: "u1", handle: "brendan" })).toBe("brendan");
    expect(publicHandle({ id: "u1", handle: null })).toBe("u1");
  });

  it("reads a handle from /@handle and nested routes", () => {
    expect(handleFromPathname("/@brendan")).toBe("brendan");
    expect(
      handleFromPathname("/@11111111-1111-1111-1111-111111111111/foster-me"),
    ).toBe("11111111-1111-1111-1111-111111111111");
    expect(handleFromPathname("/@brendan/pet/pet-1.html")).toBe("brendan");
  });

  it("returns null for the sentinel placeholder", () => {
    expect(handleFromPathname(`/@${USER_PROFILE_SENTINEL_ID}`)).toBeNull();
  });
});
