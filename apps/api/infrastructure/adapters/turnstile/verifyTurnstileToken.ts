export type TurnstileVerifier = (token: string, secret: string) => Promise<boolean>;

/** siteverify normally answers in well under a second. The API Lambda times out at 15 s. */
const SITEVERIFY_TIMEOUT_MS = 5000;

/**
 * A slow, failed or unreachable siteverify counts as a failed check (400), so the visitor can
 * retry instead of waiting for the Lambda to time out.
 */
export async function verifyTurnstileToken(
  token: string,
  secret: string,
  options: { timeoutMs?: number } = {}
): Promise<boolean> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(options.timeoutMs ?? SITEVERIFY_TIMEOUT_MS),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { success?: boolean };
    return body.success === true;
  } catch {
    return false;
  }
}
