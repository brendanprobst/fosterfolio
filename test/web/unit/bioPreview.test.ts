import {
  BIO_PREVIEW_MAX_CHARS,
  BIO_PREVIEW_MAX_LINES,
  bioExceedsPreview,
} from "@client/lib/bioPreview";
import { describe, expect, it } from "vitest";

describe("bioExceedsPreview", () => {
  it("keeps a short single-line bio in the preview", () => {
    expect(bioExceedsPreview("Fostering since 2019.")).toBe(false);
  });

  it("truncates when the character cap is exceeded", () => {
    const bio = "a".repeat(BIO_PREVIEW_MAX_CHARS + 1);
    expect(bioExceedsPreview(bio)).toBe(true);
  });

  it("truncates when the bio has more than the default line cap", () => {
    const bio = Array.from({ length: BIO_PREVIEW_MAX_LINES + 1 }, (_, i) => `Line ${i + 1}`).join(
      "\n",
    );
    expect(bio.length).toBeLessThan(BIO_PREVIEW_MAX_CHARS);
    expect(bioExceedsPreview(bio)).toBe(true);
  });

  it("honors an explicit maxLines override", () => {
    expect(bioExceedsPreview("a\nb\nc", { maxLines: 2 })).toBe(true);
    expect(bioExceedsPreview("a\nb", { maxLines: 2 })).toBe(false);
  });
});
