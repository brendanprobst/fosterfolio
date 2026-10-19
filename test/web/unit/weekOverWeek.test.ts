import { lastNDays, weekOverWeekCopy } from "@client/features/petInsights/present";
import { describe, expect, it } from "vitest";

function utcDay(offset: number, today: Date): string {
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  end.setUTCDate(end.getUTCDate() + offset);
  return end.toISOString().slice(0, 10);
}

describe("lastNDays", () => {
  it("zero-fills missing days and orders oldest to newest", () => {
    const today = new Date("2026-10-09T15:00:00.000Z");
    expect(
      lastNDays(
        [{ day: utcDay(-1, today), views: 4 }],
        (point) => point.views,
        3,
        today,
      ),
    ).toEqual([0, 4, 0]);
  });
});

describe("weekOverWeekCopy", () => {
  it("frames the change without using a down color", () => {
    expect(weekOverWeekCopy(0, 0)).toBeNull();
    expect(weekOverWeekCopy(3, 0)).toBe("New this week");
    expect(weekOverWeekCopy(12, 10)).toBe("↑ 20% vs last week");
    expect(weekOverWeekCopy(10, 10)).toBe("Steady with last week");
    expect(weekOverWeekCopy(8, 10)).toBe("Quieter than last week");
  });
});
