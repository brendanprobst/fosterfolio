import { authenticatedApiRequest } from "@client/lib/authenticatedApi";
import { publicApiRequest } from "@client/lib/publicApiRequest";
import { throwIfNotOk } from "@client/lib/readApiError";
import type { UserOwner, UserProfileUpdate, UserPublic } from "./types";

export async function fetchUserById(id: string): Promise<UserPublic> {
  const response = await publicApiRequest(`/users/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  await throwIfNotOk(
    response,
    response.status === 404 ? "Profile not found." : "Failed to load profile.",
  );
  return (await response.json()) as UserPublic;
}

export async function fetchOwnUser(token: string, id: string): Promise<UserOwner> {
  const response = await authenticatedApiRequest(`/users/${encodeURIComponent(id)}`, {
    token,
    method: "GET",
  });
  await throwIfNotOk(response, "Failed to load your profile.");
  return (await response.json()) as UserOwner;
}

export async function updateUser(
  token: string,
  id: string,
  payload: UserProfileUpdate,
): Promise<UserOwner> {
  const response = await authenticatedApiRequest(`/users/${encodeURIComponent(id)}`, {
    token,
    method: "PUT",
    body: JSON.stringify(payload),
  });
  await throwIfNotOk(response, "Failed to save profile.");
  return (await response.json()) as UserOwner;
}
