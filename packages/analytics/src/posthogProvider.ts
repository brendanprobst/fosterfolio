import {
  normalizeAggregateRow,
  type AggregateQuery,
  type AggregateRow,
  type AnalyticsProvider,
} from "./aggregates";

const COLUMNS = [
  "pet_id",
  "link_id",
  "channel_key",
  "city",
  "day",
  "views",
  "approx_visitors",
  "form_opens",
] as const;

type QueryResponse = {
  results?: unknown;
  columns?: unknown;
};

export type PostHogQueryConfig = {
  host: string;
  projectId: string;
  personalApiKey: string;
  fetchImpl?: typeof fetch;
};

/**
 * HogQL through PostHog's query API only.
 * No session replay, heatmaps, or other PostHog features.
 */
export class PostHogProvider implements AnalyticsProvider {
  constructor(private readonly config: PostHogQueryConfig) {}

  async queryAggregates(query: AggregateQuery): Promise<AggregateRow[]> {
    const host = this.config.host.replace(/\/+$/, "");
    const projectId = this.config.projectId.trim();
    const apiKey = this.config.personalApiKey.trim();
    if (!host || !projectId || !apiKey) {
      throw new Error("PostHog query config is missing host, project id, or personal API key");
    }
    if (!query.hogql.trim()) {
      throw new Error("HogQL query is empty");
    }

    const fetchImpl = this.config.fetchImpl ?? fetch;
    const response = await fetchImpl(`${host}/api/projects/${encodeURIComponent(projectId)}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: {
          kind: "HogQLQuery",
          query: query.hogql,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`PostHog query failed (${response.status}): ${text.slice(0, 500)}`);
    }

    const body = (await response.json()) as QueryResponse;
    return rowsFromQueryResponse(body).map((row) => normalizeAggregateRow(row));
  }
}

function rowsFromQueryResponse(body: QueryResponse): AggregateRow[] {
  const results = body.results;
  if (!Array.isArray(results)) {
    throw new Error("PostHog query response did not include results");
  }
  const columns = Array.isArray(body.columns)
    ? body.columns.map((column) => String(column))
    : [...COLUMNS];

  return results.map((result) => {
    if (Array.isArray(result)) {
      return rowFromValues(columns, result);
    }
    if (result && typeof result === "object") {
      return rowFromObject(result as Record<string, unknown>);
    }
    throw new Error("PostHog query row was not an array or object");
  });
}

function rowFromValues(columns: string[], values: unknown[]): AggregateRow {
  const record: Record<string, unknown> = {};
  columns.forEach((column, index) => {
    record[column] = values[index];
  });
  return rowFromObject(record);
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function rowFromObject(record: Record<string, unknown>): AggregateRow {
  return {
    pet_id: asNullableString(record.pet_id) ?? "",
    link_id: asNullableString(record.link_id),
    channel_key: asNullableString(record.channel_key) ?? "",
    city: asNullableString(record.city),
    day: asNullableString(record.day) ?? "",
    views: Number(record.views ?? 0),
    approx_visitors: Number(record.approx_visitors ?? 0),
    form_opens: Number(record.form_opens ?? 0),
  };
}
