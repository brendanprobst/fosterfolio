"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPetsByOwner } from "./petsApi";
import { petsKeys } from "./petsKeys";

export function useOwnerPets(ownerId: string | null) {
  return useQuery({
    queryKey: ownerId ? petsKeys.byOwner(ownerId) : petsKeys.all,
    queryFn: () => fetchPetsByOwner(ownerId!),
    enabled: !!ownerId,
  });
}
