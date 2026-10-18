import { readInquirySecrets } from '@api/infrastructure/composition/inquiries';

const STRONG_SECRET = 'a'.repeat(44);

describe('readInquirySecrets', () => {
  it('refuses to start production without the Turnstile secret', () => {
    expect(() =>
      readInquirySecrets({ NODE_ENV: 'production', INQUIRY_SOURCE_TOKEN_SECRET: STRONG_SECRET })
    ).toThrow('TURNSTILE_SECRET_KEY required when NODE_ENV=production');
  });

  it('refuses to start production without the source token secret', () => {
    expect(() =>
      readInquirySecrets({ NODE_ENV: 'production', TURNSTILE_SECRET_KEY: 'turnstile' })
    ).toThrow('INQUIRY_SOURCE_TOKEN_SECRET required when NODE_ENV=production');
  });

  it('names both secrets when production has neither, and treats blank values as missing', () => {
    expect(() =>
      readInquirySecrets({
        NODE_ENV: 'production',
        TURNSTILE_SECRET_KEY: '  ',
        INQUIRY_SOURCE_TOKEN_SECRET: '',
      })
    ).toThrow('TURNSTILE_SECRET_KEY and INQUIRY_SOURCE_TOKEN_SECRET required');
  });

  it('refuses a short source token secret in production', () => {
    expect(() =>
      readInquirySecrets({
        NODE_ENV: 'production',
        TURNSTILE_SECRET_KEY: 'turnstile',
        INQUIRY_SOURCE_TOKEN_SECRET: 'changeme',
      })
    ).toThrow('INQUIRY_SOURCE_TOKEN_SECRET must be at least 32 characters');
  });

  it('returns trimmed secrets in production', () => {
    expect(
      readInquirySecrets({
        NODE_ENV: 'production',
        TURNSTILE_SECRET_KEY: ' turnstile ',
        INQUIRY_SOURCE_TOKEN_SECRET: ` ${STRONG_SECRET} `,
      })
    ).toEqual({ turnstileSecret: 'turnstile', sourceTokenSecret: STRONG_SECRET });
  });

  it('skips Turnstile outside production and signs with a random per-process key', () => {
    const first = readInquirySecrets({ NODE_ENV: 'development' });
    expect(first.turnstileSecret).toBeNull();
    expect(first.sourceTokenSecret.length).toBeGreaterThanOrEqual(32);
    expect(first.sourceTokenSecret).not.toBe('fosterfolio-dev-inquiry-source-token');
    expect(readInquirySecrets({}).sourceTokenSecret).toBe(first.sourceTokenSecret);
  });
});
