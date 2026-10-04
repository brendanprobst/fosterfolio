"use client";

import { useAuth } from "@client/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPet, deletePet, updatePet } from "./petsApi";
import { petsKeys } from "./petsKeys";
import type { PetWritePayload } from "./types";

export function useCreatePetMutation() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PetWritePayload) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in to add a pet.");
      return createPet(token, payload);
    },
    onSuccess: (pet) => {
      void queryClient.invalidateQueries({ queryKey: petsKeys.byOwner(pet.ownerId) });
      void queryClient.invalidateQueries({ queryKey: petsKeys.detail(pet.id) });
    },
  });
}

export function useUpdatePetMutation() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<PetWritePayload>;
    }) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in to update a pet.");
      return updatePet(token, id, payload);
    },
    onSuccess: (pet) => {
      void queryClient.invalidateQueries({ queryKey: petsKeys.byOwner(pet.ownerId) });
      void queryClient.invalidateQueries({ queryKey: petsKeys.detail(pet.id) });
    },
  });
}

export function useDeletePetMutation() {
  const { getAccessToken, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in to remove a pet.");
      await deletePet(token, id);
      return id;
    },
    onSuccess: (id) => {
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: petsKeys.byOwner(user.id) });
      }
      void queryClient.invalidateQueries({ queryKey: petsKeys.detail(id) });
    },
  });
}
