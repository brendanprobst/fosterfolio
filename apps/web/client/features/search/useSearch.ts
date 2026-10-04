"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSearch } from "./searchApi";
import { searchKeys } from "./searchKeys";

export function useSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: searchKeys.query(q),
    queryFn: () => fetchSearch(q),
    enabled: q.length > 0,
  });
}
