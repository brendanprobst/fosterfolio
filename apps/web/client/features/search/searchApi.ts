import { publicApiRequest } from "@client/lib/publicApiRequest";
import { throwIfNotOk } from "@client/lib/readApiError";
import type { SearchResult } from "./types";

export async function fetchSearch(query: string): Promise<SearchResult> {
  const params = new URLSearchParams({ q: query });
  const response = await publicApiRequest(`/search?${params}`, { method: "GET" });
  await throwIfNotOk(response, "Search failed.");
  return (await response.json()) as SearchResult;
}
