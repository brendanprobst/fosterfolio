import {
  clearViewerHint,
  readViewerHint,
  viewerMatchesOwnerSegment,
  writeViewerHint,
} from "@client/lib/viewerHint";
import { beforeEach, describe, expect, it } from "vitest";

describe("viewerHint", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips and clears the stored hint", () => {
    writeViewerHint({ id: "owner-1", handle: "alex" });
    expect(readViewerHint()).toEqual({ id: "owner-1", handle: "alex" });

    clearViewerHint();
    expect(readViewerHint()).toBeNull();
  });

  it("ignores malformed stored values", () => {
    window.localStorage.setItem("fosterfolio:viewer-hint", "{not json");
    expect(readViewerHint()).toBeNull();
    window.localStorage.setItem("fosterfolio:viewer-hint", JSON.stringify({ handle: "alex" }));
    expect(readViewerHint()).toBeNull();
  });

  it("matches the URL owner segment by id or handle, ignoring case", () => {
    const viewer = { id: "Owner-1", handle: "Alex" };
    expect(viewerMatchesOwnerSegment(viewer, "owner-1")).toBe(true);
    expect(viewerMatchesOwnerSegment(viewer, "alex")).toBe(true);
    expect(viewerMatchesOwnerSegment(viewer, "sam")).toBe(false);
    expect(viewerMatchesOwnerSegment({ id: "owner-1", handle: null }, "")).toBe(false);
    expect(viewerMatchesOwnerSegment(null, "alex")).toBe(false);
  });
});
