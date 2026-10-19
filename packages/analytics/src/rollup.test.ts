import { readFileSync } from "fs";
import path from "path";
import { aggregateKey, type AggregateRow, type AnalyticsProvider } from "./aggregates";
import { runRollup } from "./rollup";

const day = "2026-10-08";

function row(overrides: Partial<AggregateRow> = {}): AggregateRow {
  return {
    pet_id: "pet-1",
    link_id: "link-1",
    channel_key: "instagram",
    city: "Austin",
    day,
    views: 2,
    approx_visitors: 2,
    form_opens: 1,
    ...overrides,
  };
}

function memoryUpsert(store: Map<string, AggregateRow>) {
  return async (rows: AggregateRow[]) => {
    for (const next of rows) {
      store.set(aggregateKey(next), next);
    }
  };
}

describe("rollup runner", () => {
  it("upserts a key once and replaces it on the next run without dropping other days", async () => {
    const store = new Map<string, AggregateRow>();
    const older = row({ day: "2026-09-01", views: 9, approx_visitors: 4, form_opens: 0 });
    store.set(aggregateKey(older), older);

    const provider: AnalyticsProvider = {
      queryAggregates: async () => [row({ views: 2 })],
    };
    const first = await runRollup({
      provider,
      query: { hogql: "select 1" },
      upsert: memoryUpsert(store),
    });
    expect(first).toEqual({ rows: 1, skipped: 0 });
    expect(store.get(aggregateKey(row()))?.views).toBe(2);
    expect(store.get(aggregateKey(older))?.views).toBe(9);

    const secondProvider: AnalyticsProvider = {
      queryAggregates: async () => [row({ views: 5, approx_visitors: 3, form_opens: 2 })],
    };
    await runRollup({
      provider: secondProvider,
      query: { hogql: "select 1" },
      upsert: memoryUpsert(store),
    });

    expect(store.size).toBe(2);
    expect(store.get(aggregateKey(row()))).toEqual(
      row({ views: 5, approx_visitors: 3, form_opens: 2 }),
    );
    expect(store.get(aggregateKey(older))?.views).toBe(9);
  });

  it("skips malformed rows instead of aborting the run", async () => {
    const store = new Map<string, AggregateRow>();
    const provider: AnalyticsProvider = {
      queryAggregates: async () => [
        row({ pet_id: "" }),
        row({ pet_id: "pet-2", channel_key: "  " }),
        row({ pet_id: "pet-3", day: "yesterday" }),
        row({ pet_id: "pet-4", views: Number.NaN }),
        row({ pet_id: "pet-5", form_opens: -1 }),
        row({ pet_id: 42 as unknown as string }),
        row(),
      ],
    };

    const result = await runRollup({
      provider,
      query: { hogql: "select 1" },
      upsert: memoryUpsert(store),
    });

    expect(result).toEqual({ rows: 1, skipped: 6 });
    expect([...store.values()]).toEqual([row()]);
  });

  it("does not store inquiry_submitted", async () => {
    const store = new Map<string, AggregateRow>();
    const dirty = {
      ...row(),
      inquiry_submitted: 4,
      inquiries: 4,
    } as AggregateRow;
    const provider: AnalyticsProvider = {
      queryAggregates: async () => [dirty],
    };

    await runRollup({
      provider,
      query: { hogql: "select 1" },
      upsert: memoryUpsert(store),
    });

    const stored = store.get(aggregateKey(row()));
    expect(stored).toEqual(row());
    expect(stored && "inquiry_submitted" in stored).toBe(false);
    expect(stored && "inquiries" in stored).toBe(false);
    expect(Object.keys(stored ?? {}).sort()).toEqual(
      [
        "approx_visitors",
        "channel_key",
        "city",
        "day",
        "form_opens",
        "link_id",
        "pet_id",
        "views",
      ].sort(),
    );
  });

  it("keeps the server entry off the browser client", () => {
    const src = path.join(process.cwd(), "packages/analytics/src");
    for (const file of ["server.ts", "rollup.ts", "aggregates.ts", "posthogProvider.ts"]) {
      const text = readFileSync(path.join(src, file), "utf8");
      expect(text).not.toContain("posthog-js");
      expect(text).not.toContain("./client");
      expect(text).not.toContain("initFosterfolioAnalytics");
    }
  });
});
