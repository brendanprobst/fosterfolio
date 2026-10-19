import {
  normalizeAggregateRow,
  type AggregateQuery,
  type AggregateRow,
  type AnalyticsProvider,
} from "./aggregates";

export type RollupUpsert = (rows: AggregateRow[]) => Promise<void>;

/**
 * Runs one app-supplied query and hands the rows to an app-supplied upsert.
 * It does not know about pets, inquiries, or Supabase, and it does not delete
 * rows the query did not return. Malformed rows are skipped and counted.
 */
export async function runRollup(input: {
  provider: AnalyticsProvider;
  query: AggregateQuery;
  upsert: RollupUpsert;
}): Promise<{ rows: number; skipped: number }> {
  const queried = await input.provider.queryAggregates(input.query);
  const rows = queried
    .map((row) => normalizeAggregateRow(row))
    .filter((row): row is AggregateRow => row !== null);
  await input.upsert(rows);
  return { rows: rows.length, skipped: queried.length - rows.length };
}
