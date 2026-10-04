import { authenticatedApiRequest } from "@client/lib/authenticatedApi";

export type SignUploadResponse = {
  uploadUrl: string;
  publicUrl: string;
  path: string;
  contentType: string;
  usedBytes: number;
  capBytes: number;
};

type ApiErrorBody = {
  error?: {
    status?: number;
    code?: string;
    message?: string;
  };
};

export async function signUpload(
  token: string,
  input: {
    filename: string;
    contentType: string;
    contentLength: number;
  },
): Promise<SignUploadResponse> {
  const params = new URLSearchParams({
    filename: input.filename,
    contentType: input.contentType,
    contentLength: String(input.contentLength),
  });
  const response = await authenticatedApiRequest(`/storage/sign?${params}`, {
    token,
    method: "POST",
  });

  if (!response.ok) {
    let message = "Failed to prepare upload.";
    let code: string | undefined;
    try {
      const body = (await response.json()) as ApiErrorBody;
      if (body.error?.message) message = body.error.message;
      code = body.error?.code;
    } catch {
      // keep default
    }
    const err = new Error(message) as Error & { code?: string; status?: number };
    err.status = response.status;
    if (code) err.code = code;
    throw err;
  }

  return (await response.json()) as SignUploadResponse;
}

/** Upload bytes to a Supabase signed upload URL. */
export async function uploadToSignedUrl(
  uploadUrl: string,
  blob: Blob,
  contentType: string,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: blob,
  });
  if (!response.ok) {
    throw new Error("Upload to storage failed.");
  }
}
