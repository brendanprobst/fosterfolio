/**
 * PostgREST filter values. PostgREST URL-decodes the query before it parses filter grammar,
 * so a value needs both: double quotes for reserved characters (`,` `.` `(` `)` `"` …), then
 * URL encoding so `&` or `#` can't end the parameter early.
 */
function quote(value: string): string {
  if (/^[A-Za-z0-9_-]+$/.test(value)) return value;
  return `"${value.replace(/[\\"]/g, '\\$&')}"`;
}

/** Right-hand side of `col=eq.<value>`. */
export function eqValue(value: string): string {
  return encodeURIComponent(quote(value));
}

/** Right-hand side of `col=in.<list>`, e.g. `(a,b)`. */
export function inList(values: readonly string[]): string {
  return `(${values.map(eqValue).join(',')})`;
}

/** About 3.7 KB of encoded UUIDs per request, well under URL length limits. */
export const IN_LIST_CHUNK = 100;

export function chunk<T>(items: readonly T[], size = IN_LIST_CHUNK): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
