import { authenticatedApiRequest } from "@client/lib/authenticatedApi";
import { publicApiRequest } from "@client/lib/publicApiRequest";
import { throwIfNotOk } from "@client/lib/readApiError";
import type { CreatePostPayload, FeedPage, PostPublic } from "./types";

export async function fetchFeed(input: {
  cursor?: string;
  limit?: number;
}): Promise<FeedPage> {
  const params = new URLSearchParams();
  if (input.cursor) params.set("cursor", input.cursor);
  if (input.limit) params.set("limit", String(input.limit));
  const suffix = params.size > 0 ? `?${params}` : "";
  const response = await publicApiRequest(`/posts${suffix}`, { method: "GET" });
  await throwIfNotOk(response, "Failed to load the feed.");
  return (await response.json()) as FeedPage;
}

export async function fetchPostsByAuthor(authorId: string): Promise<PostPublic[]> {
  const response = await publicApiRequest(
    `/users/${encodeURIComponent(authorId)}/posts`,
    { method: "GET" },
  );
  await throwIfNotOk(response, "Failed to load posts.");
  return (await response.json()) as PostPublic[];
}

export async function createPost(
  token: string,
  payload: CreatePostPayload,
): Promise<PostPublic> {
  const response = await authenticatedApiRequest("/posts", {
    token,
    method: "POST",
    body: JSON.stringify(payload),
  });
  await throwIfNotOk(response, "Failed to publish post.");
  return (await response.json()) as PostPublic;
}
