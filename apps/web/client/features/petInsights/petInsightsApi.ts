import { authenticatedApiRequest } from "@client/lib/authenticatedApi";
import { throwIfNotOk } from "@client/lib/readApiError";
import type {
  ChannelOption,
  OwnerLinkAnalytics,
  PetAnalytics,
  PetAnalyticsSummary,
  TrackedLinkItem,
} from "./types";

async function authedJson<T>(token: string, path: string, fallback: string): Promise<T> {
  const response = await authenticatedApiRequest(path, { token, method: "GET" });
  await throwIfNotOk(response, fallback);
  return (await response.json()) as T;
}

export function fetchPetLinks(token: string, petId: string): Promise<TrackedLinkItem[]> {
  return authedJson(token, `/pets/${encodeURIComponent(petId)}/links`, "Failed to load links.");
}

/** Every owner link, both targets, archived included. */
export function fetchOwnerLinks(token: string): Promise<TrackedLinkItem[]> {
  return authedJson(token, "/me/links", "Failed to load links.");
}

export function fetchOwnerLinkAnalytics(
  token: string,
  range: "7d" | "30d" | "all",
): Promise<OwnerLinkAnalytics> {
  return authedJson(token, `/me/links/analytics?range=${range}`, "Failed to load link analytics.");
}

/** Creates a foster-me link. `isDefault` takes the reserved default channel. */
export async function createOwnerLink(
  token: string,
  body:
    | { isDefault: true }
    | { channelKey?: string; channelName?: string; label?: string | null },
): Promise<TrackedLinkItem> {
  const response = await authenticatedApiRequest("/me/links", {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
  await throwIfNotOk(response, "Failed to create link.");
  return (await response.json()) as TrackedLinkItem;
}

export function fetchChannels(token: string): Promise<ChannelOption[]> {
  return authedJson(token, "/me/channels", "Failed to load channels.");
}

export function fetchPetAnalytics(
  token: string,
  petId: string,
  range: "7d" | "30d" | "all",
): Promise<PetAnalytics> {
  return authedJson(
    token,
    `/pets/${encodeURIComponent(petId)}/analytics?range=${range}`,
    "Failed to load analytics.",
  );
}

export function fetchPetAnalyticsSummary(
  token: string,
  petId: string,
): Promise<PetAnalyticsSummary> {
  // Unused since 5a-owner-widget; endpoint removed in slice 5b.
  return authedJson(
    token,
    `/pets/${encodeURIComponent(petId)}/analytics/summary`,
    "Failed to load analytics.",
  );
}

export async function createTrackedLink(
  token: string,
  petId: string,
  body: { channelKey?: string; channelName?: string; label?: string | null },
): Promise<TrackedLinkItem> {
  const response = await authenticatedApiRequest(`/pets/${encodeURIComponent(petId)}/links`, {
    token,
    method: "POST",
    body: JSON.stringify(body),
  });
  await throwIfNotOk(response, "Failed to create link.");
  return (await response.json()) as TrackedLinkItem;
}

export async function archiveTrackedLink(
  token: string,
  linkId: string,
  archived: boolean,
): Promise<TrackedLinkItem> {
  const response = await authenticatedApiRequest(`/links/${encodeURIComponent(linkId)}`, {
    token,
    method: "PATCH",
    body: JSON.stringify({ archived }),
  });
  await throwIfNotOk(response, "Failed to update link.");
  return (await response.json()) as TrackedLinkItem;
}
