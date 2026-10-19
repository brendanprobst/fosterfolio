import { verifyTurnstileToken } from '@api/infrastructure/adapters/turnstile/verifyTurnstileToken';

describe('verifyTurnstileToken', () => {
  const savedFetch = global.fetch;

  afterEach(() => {
    global.fetch = savedFetch;
  });

  it('returns true only for a successful siteverify response', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false })))
      .mockResolvedValueOnce(new Response('oops', { status: 500 }));

    expect(await verifyTurnstileToken('token', 'secret')).toBe(true);
    expect(await verifyTurnstileToken('token', 'secret')).toBe(false);
    expect(await verifyTurnstileToken('token', 'secret')).toBe(false);
  });

  it('gives up on a slow siteverify instead of holding the request until the Lambda times out', async () => {
    let signal: AbortSignal | undefined;
    global.fetch = jest.fn((_url: unknown, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(signal?.reason));
      });
    }) as typeof fetch;

    const started = Date.now();
    expect(await verifyTurnstileToken('token', 'secret', { timeoutMs: 20 })).toBe(false);
    expect(signal?.aborted).toBe(true);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('treats a network error as a failed check', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed'));

    expect(await verifyTurnstileToken('token', 'secret')).toBe(false);
  });
});
