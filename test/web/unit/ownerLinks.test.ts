import type { TrackedLinkItem } from "@client/features/petInsights/types";
import {
  groupOwnerLinks,
  isFirstRun,
  sparklineDays,
  statsByLink,
} from "@client/pages/links/ownerLinks";
import { describe, expect, it } from "vitest";

function link(overrides: Partial<TrackedLinkItem> = {}): TrackedLinkItem {
  return {
    id: "l1",
    target: "foster_me",
    petId: null,
    code: "abc",
    channelKey: "instagram",
    channelName: "Instagram",
    label: null,
    archivedAt: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    views: 0,
    inquiries: 0,
    ...overrides,
  };
}

describe("groupOwnerLinks", () => {
  it("pins the default link first, then sorts newest first", () => {
    const older = link({ id: "older", createdAt: "2026-10-01T00:00:00.000Z" });
    const newer = link({ id: "newer", createdAt: "2026-10-05T00:00:00.000Z" });
    const def = link({ id: "def", channelKey: "default", createdAt: "2026-09-01T00:00:00.000Z" });

    expect(groupOwnerLinks([older, def, newer]).active.map((l) => l.id)).toEqual([
      "def",
      "newer",
      "older",
    ]);
  });

  it("splits archived foster-me links and legacy pet links out of the active list", () => {
    const archived = link({ id: "arch", archivedAt: "2026-10-02T00:00:00.000Z" });
    const legacy = link({ id: "pet", target: "pet", petId: "p1", petName: "Mochi" });
    const legacyArchived = link({
      id: "pet-arch",
      target: "pet",
      petId: "p1",
      archivedAt: "2026-10-02T00:00:00.000Z",
    });

    const groups = groupOwnerLinks([link(), archived, legacy, legacyArchived]);

    expect(groups.active.map((l) => l.id)).toEqual(["l1"]);
    expect(groups.archived.map((l) => l.id)).toEqual(["arch"]);
    expect(groups.legacy.map((l) => l.id).sort()).toEqual(["pet", "pet-arch"]);
  });

  it("does not treat a legacy pet link on a 'default' key as the pinned default", () => {
    const groups = groupOwnerLinks([link({ target: "pet", petId: "p1", channelKey: "default" })]);
    expect(groups.active).toEqual([]);
  });
});

describe("isFirstRun", () => {
  it("is true with no links, only archived ones, or only legacy pet links", () => {
    expect(isFirstRun([])).toBe(true);
    expect(isFirstRun([link({ archivedAt: "2026-10-02T00:00:00.000Z" })])).toBe(true);
    expect(isFirstRun([link({ target: "pet", petId: "p1" })])).toBe(true);
  });

  it("is false once an active foster-me link exists", () => {
    expect(isFirstRun([link()])).toBe(false);
  });
});

describe("statsByLink", () => {
  it("keys rows by link id and keeps untagged traffic under null", () => {
    const stats = statsByLink({
      funnel: { previewViews: 5, petTaps: 2, inquiries: 1 },
      byLink: [
        { linkId: "l1", previewViews: 3, petTaps: 1, inquiries: 1 },
        { linkId: null, previewViews: 2, petTaps: 1, inquiries: 0 },
      ],
      previewViewsByDay: [],
      inquiriesByDay: [],
    });

    expect(stats.get("l1")).toEqual({ previewViews: 3, petTaps: 1, inquiries: 1 });
    expect(stats.get(null)).toEqual({ previewViews: 2, petTaps: 1, inquiries: 0 });
  });
});

describe("sparklineDays", () => {
  const today = new Date("2026-10-11T12:00:00.000Z");

  it("uses the fixed span for 7d and 30d", () => {
    expect(sparklineDays("7d", [], today)).toBe(7);
    expect(sparklineDays("30d", ["2026-01-01"], today)).toBe(30);
  });

  it("spans from the first data point for all time, at least a week", () => {
    expect(sparklineDays("all", ["2026-09-12", "2026-10-01"], today)).toBe(30);
    expect(sparklineDays("all", ["2026-10-10"], today)).toBe(7);
    expect(sparklineDays("all", [], today)).toBe(30);
  });
});
