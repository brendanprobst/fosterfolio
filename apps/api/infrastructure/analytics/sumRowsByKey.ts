/**
 * Folds rows that share a key into the first one, in input order. A bulk `on conflict do update`
 * fails if one statement touches the same row twice, and rows trimmed to the same key by
 * normalization are separate traffic, so they are added rather than dropped.
 */
export function sumRowsByKey<T>(
  rows: readonly T[],
  key: (row: T) => string,
  add: (a: T, b: T) => T
): T[] {
  const byKey = new Map<string, T>();
  for (const row of rows) {
    const k = key(row);
    const existing = byKey.get(k);
    byKey.set(k, existing ? add(existing, row) : row);
  }
  return [...byKey.values()];
}
