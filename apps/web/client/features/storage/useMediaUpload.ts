"use client";

import { useAuth } from "@client/auth";
import { downscaleImage } from "@client/lib/media/downscaleImage";
import { useMutation } from "@tanstack/react-query";
import { signUpload, uploadToSignedUrl } from "./storageApi";

export type MediaUploadResult = {
  publicUrl: string;
  path: string;
  contentType: string;
};

/**
 * Downscale → sign → PUT. See `docs/playbooks/media-upload.md`.
 * Surface `error.message` for STORAGE_CAP_EXCEEDED verbatim in the UI.
 */
export function useMediaUpload() {
  const { getAccessToken } = useAuth();

  return useMutation({
    mutationFn: async (file: File): Promise<MediaUploadResult> => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Sign in to upload photos.");
      }

      const prepared = await downscaleImage(file);
      const signed = await signUpload(token, {
        filename: prepared.filename,
        contentType: prepared.contentType,
        contentLength: prepared.blob.size,
      });
      await uploadToSignedUrl(
        signed.uploadUrl,
        prepared.blob,
        prepared.contentType,
      );
      return {
        publicUrl: signed.publicUrl,
        path: signed.path,
        contentType: prepared.contentType,
      };
    },
  });
}
