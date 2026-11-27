type ApiErrorBody = {
  error?: {
    status?: number;
    code?: string;
    message?: string;
    metadata?: Record<string, unknown>;
  };
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  /** Extra error details from the API, e.g. `nextChangeAt` for HANDLE_CHANGE_LIMIT. */
  readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code?: string,
    metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    if (code) this.code = code;
    if (metadata) this.metadata = metadata;
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
  let metadata: Record<string, unknown> | undefined;
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (body.error?.message) message = body.error.message;
    if (body.error?.code) code = body.error.code;
    if (body.error?.metadata) metadata = body.error.metadata;
  } catch {
    // keep fallback
  }
  throw new ApiRequestError(message, response.status, code, metadata);
}
