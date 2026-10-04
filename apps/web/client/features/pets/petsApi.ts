import { authenticatedApiRequest } from "@client/lib/authenticatedApi";
import { publicApiRequest } from "@client/lib/publicApiRequest";
import { throwIfNotOk } from "@client/lib/readApiError";
import type { PetPublic, PetWritePayload } from "./types";

export async function fetchPetById(id: string): Promise<PetPublic> {
  const response = await publicApiRequest(`/pets/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  await throwIfNotOk(
    response,
    response.status === 404 ? "Pet not found." : "Failed to load pet.",
  );
  return (await response.json()) as PetPublic;
}

export async function fetchPetsByOwner(ownerId: string): Promise<PetPublic[]> {
  const response = await publicApiRequest(
    `/users/${encodeURIComponent(ownerId)}/pets`,
    { method: "GET" },
  );
  await throwIfNotOk(response, "Failed to load pets.");
  return (await response.json()) as PetPublic[];
}

export async function createPet(
  token: string,
  payload: PetWritePayload,
): Promise<PetPublic> {
  const response = await authenticatedApiRequest("/pets", {
    token,
    method: "POST",
    body: JSON.stringify(payload),
  });
  await throwIfNotOk(response, "Failed to create pet.");
  return (await response.json()) as PetPublic;
}

export async function updatePet(
  token: string,
  id: string,
  payload: Partial<PetWritePayload>,
): Promise<PetPublic> {
  const response = await authenticatedApiRequest(`/pets/${encodeURIComponent(id)}`, {
    token,
    method: "PUT",
    body: JSON.stringify(payload),
  });
  await throwIfNotOk(response, "Failed to update pet.");
  return (await response.json()) as PetPublic;
}

export async function deletePet(token: string, id: string): Promise<void> {
  const response = await authenticatedApiRequest(`/pets/${encodeURIComponent(id)}`, {
    token,
    method: "DELETE",
  });
  await throwIfNotOk(response, "Failed to delete pet.");
}
