import { bucketTrend } from "@client/features/petInsights/present";
import { describe, expect, it } from "vitest";

function days(start: string, count: number): string[] {
  const out: string[] = [];
  const date = new Date(`${start}T00:00:00.000Z`);
  for (let i = 0; i < count; i++) {
    out.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return out;
}

describe("bucketTrend", () => {
  it("returns an empty day series when nothing happened", () => {
    expect(bucketTrend([], [])).toEqual({ grain: "day", points: [] });
  });

  it("zero-fills a gap when the series stays on a day grain", () => {
    const span = days("2026-10-01", 15);
    const missing = span[5]!;
    const trend = bucketTrend(
      span.filter((day) => day !== missing).map((day) => ({ day, views: 1 })),
      [],
    );
    expect(trend.grain).toBe("day");
    expect(trend.points).toHaveLength(15);
    expect(trend.points[5]).toEqual({ label: missing, views: 0, inquiries: 0 });
  });

  it("keeps a day grain once 14 days have views", () => {
    const span = days("2026-10-01", 16);
    const trend = bucketTrend(
      span.slice(0, 14).map((day) => ({ day, views: 1 })),
      [],
    );
    expect(trend.grain).toBe("day");
    expect(trend.points.map((point) => point.label)).toEqual(span.slice(0, 14));
    expect(trend.points[1]).toEqual({ label: "2026-10-02", views: 1, inquiries: 0 });
  });

  it("keeps inquiry-only days in the weekly total", () => {
    const trend = bucketTrend([], [{ day: "2026-10-03", inquiries: 2 }]);
    expect(trend.grain).toBe("week");
    expect(trend.points).toEqual([{ label: "2026-09-28", views: 0, inquiries: 2 }]);
  });
});
