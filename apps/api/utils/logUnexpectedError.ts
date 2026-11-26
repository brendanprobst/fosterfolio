/**
 * Single error-logging path for unexpected (non-domain) failures.
 *
 * Use cases return a generic INTERNAL_SERVER_ERROR to clients, so this log line is the
 * only place the real exception surfaces in CloudWatch. Every such catch block calls this
 * with the class name as scope, so logs are searchable by `[ScopeName] unexpected error`.
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
}

export function logUnexpectedError(scope: string, error: unknown): void {
  console.error(`[${scope}] unexpected error`, describeError(error));
}
