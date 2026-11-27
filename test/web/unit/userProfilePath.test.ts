import { USER_PROFILE_SENTINEL_ID } from "@client/lib/constants/userProfileSentinel";
import {
  canonicalProfilePath,
  fosterMeHref,
  fosterMeLinkHref,
  handleEditConfirmMessage,
  handleEditDelta,
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
    expect(fosterMeLinkHref("brendan", "ab c")).toBe("/@brendan/foster-me?s=ab%20c");
  });

  it("classifies handle edits so the form can skip or confirm", () => {
    expect(handleEditDelta("brendan", " Brendan ")).toEqual({
      next: "brendan",
      changed: false,
      kind: "none",
    });
    expect(handleEditDelta(null, "Alex")).toEqual({
      next: "alex",
      changed: true,
      kind: "claim",
    });
    expect(handleEditDelta("brendan", "")).toEqual({
      next: null,
      changed: true,
      kind: "clear",
    });
    expect(handleEditDelta("brendan", "brendan_p")).toEqual({
      next: "brendan_p",
      changed: true,
      kind: "rename",
    });
    expect(handleEditConfirmMessage("clear", "brendan", null)).toMatch(
      /\/@brendan will still open your profile/,
    );
    expect(handleEditConfirmMessage("rename", "brendan", "brendan_p")).toMatch(
      /\/@brendan_p/,
    );
    expect(handleEditConfirmMessage("claim", null, "alex")).toBeNull();
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

  it("builds the canonical path for a former handle, keeping the sub-path and query", () => {
    expect(canonicalProfilePath("/@elisa-probst", "elisa")).toBe("/@elisa");
    expect(canonicalProfilePath("/@elisa-probst/foster-me", "elisa")).toBe(
      "/@elisa/foster-me",
    );
    expect(canonicalProfilePath("/@elisa-probst/foster-me", "elisa", "?s=ab12")).toBe(
      "/@elisa/foster-me?s=ab12",
    );
    expect(canonicalProfilePath("/@elisa-probst/pet/pet-1.html", "elisa")).toBe(
      "/@elisa/pet/pet-1",
    );
  });

  it("does not redirect when the handle is already canonical or unknown", () => {
    expect(canonicalProfilePath("/@elisa", "elisa")).toBeNull();
    expect(canonicalProfilePath("/@elisa", undefined)).toBeNull();
    expect(canonicalProfilePath("/@elisa", null)).toBeNull();
    expect(canonicalProfilePath("/feed", "elisa")).toBeNull();
    expect(canonicalProfilePath(`/@${USER_PROFILE_SENTINEL_ID}`, "elisa")).toBeNull();
  });
});
