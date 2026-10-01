import { isAllowedImageFile } from "@client/lib/media/isAllowedImageFile";
import { describe, expect, it } from "vitest";

describe("isAllowedImageFile", () => {
  it("accepts jpeg/png/webp/gif and rejects other types", () => {
    expect(isAllowedImageFile({ type: "image/png" })).toBe(true);
    expect(isAllowedImageFile({ type: "image/jpeg" })).toBe(true);
    expect(isAllowedImageFile({ type: "application/pdf" })).toBe(false);
    expect(isAllowedImageFile(null)).toBe(false);
  });
});
