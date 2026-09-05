import { USER_PROFILE_SENTINEL_ID } from "@client/lib/constants/userProfileSentinel";
import { userIdFromPathname, userProfileHref } from "@client/lib/userProfilePath";
import { describe, expect, it } from "vitest";

describe("userIdFromPathname", () => {
  it("reads a real user id from /users/{id}", () => {
    expect(
      userIdFromPathname("/users/11111111-1111-1111-1111-111111111111"),
    ).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("returns null for the sentinel placeholder", () => {
    expect(userIdFromPathname(`/users/${USER_PROFILE_SENTINEL_ID}`)).toBeNull();
  });

  it("builds a public profile href", () => {
    expect(userProfileHref("abc")).toBe("/users/abc");
  });
});
