import { displayInitials } from "@client/lib/displayInitials";
import { describe, expect, it } from "vitest";

describe("displayInitials", () => {
  it("uses the first letters of up to two words", () => {
    expect(displayInitials("Alex Foster")).toBe("AF");
  });

  it("falls back to a question mark when empty", () => {
    expect(displayInitials(null)).toBe("?");
    expect(displayInitials("  ")).toBe("?");
  });
});
