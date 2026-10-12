"use client";

import { useAuth } from "@client/auth";
import { petsKeys } from "@client/features/pets/petsKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPost } from "./postsApi";
import { postsKeys } from "./postsKeys";
import type { CreatePostPayload } from "./types";

export function useCreatePostMutation() {
  const { getAccessToken, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePostPayload) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in to post.");
      return createPost(token, payload);
    },
    onSuccess: (_post, payload) => {
      void queryClient.invalidateQueries({ queryKey: postsKeys.feed() });
      if (payload.petId) {
        void queryClient.invalidateQueries({ queryKey: petsKeys.detail(payload.petId) });
      }
      if (user?.id) {
        void queryClient.invalidateQueries({
          queryKey: postsKeys.byAuthor(user.id),
        });
      }
    },
  });
}
