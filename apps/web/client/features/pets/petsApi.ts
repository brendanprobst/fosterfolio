import { publicApiRequest } from "@client/lib/publicApiRequest";
import type { PetPublic } from "./types";

export async function fetchPetById(id: string): Promise<PetPublic> {
  const response = await publicApiRequest(`/pets/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "Pet not found."
        : "Failed to load pet.",
    );
  }
  return (await response.json()) as PetPublic;
}
