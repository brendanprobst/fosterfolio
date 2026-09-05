type ApiErrorBody = {
  error?: {
    status?: number;
    code?: string;
    message?: string;
  };
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    if (code) this.code = code;
  }
}

/** Read `{ error: { message, code } }` from a failed Fosterfolio API response. */
export async function throwIfNotOk(
  response: Response,
  fallback: string,
): Promise<void> {
  if (response.ok) return;

  let message = fallback;
  let code: string | undefined;
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (body.error?.message) message = body.error.message;
    if (body.error?.code) code = body.error.code;
  } catch {
    // keep fallback
  }
  throw new ApiRequestError(message, response.status, code);
}
