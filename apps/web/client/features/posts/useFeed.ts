"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchFeed, fetchPostsByAuthor } from "./postsApi";
import { postsKeys } from "./postsKeys";

export function useFeed() {
  return useInfiniteQuery({
    queryKey: postsKeys.feed(),
    queryFn: ({ pageParam }) =>
      fetchFeed({
        limit: 20,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useAuthorPosts(authorId: string | null) {
  return useQuery({
    queryKey: authorId ? postsKeys.byAuthor(authorId) : postsKeys.all,
    queryFn: () => fetchPostsByAuthor(authorId!),
    enabled: !!authorId,
  });
}
