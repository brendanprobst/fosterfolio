"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPetById } from "./petsApi";
import { petsKeys } from "./petsKeys";

export function usePet(id: string | null) {
  return useQuery({
    queryKey: id ? petsKeys.detail(id) : petsKeys.all,
    queryFn: () => fetchPetById(id!),
    enabled: !!id,
  });
}
