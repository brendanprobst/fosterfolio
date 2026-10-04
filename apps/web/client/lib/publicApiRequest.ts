import { getPublicApiBaseUrl } from "@client/lib/publicApiBaseUrl";

/** Unauthenticated browser fetch to the Fosterfolio API. */
export async function publicApiRequest(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { headers, ...requestInit } = init;
  return await fetch(`${getPublicApiBaseUrl()}${path}`, {
    ...requestInit,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}
