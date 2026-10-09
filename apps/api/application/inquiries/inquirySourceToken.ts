import { createHmac, timingSafeEqual } from 'crypto';

const TTL_MS = 30 * 60 * 1000;

function secret(): string {
  return (
    process.env.INQUIRY_SOURCE_TOKEN_SECRET?.trim() ||
    'fosterfolio-dev-inquiry-source-token'
  );
}

export function signInquirySourceToken(inquiryId: string): string {
  const sig = createHmac('sha256', secret()).update(inquiryId).digest('base64url');
  return `${inquiryId}.${sig}`;
}

export function inquirySourceTokenMatches(inquiryId: string, token: string): boolean {
  const expected = signInquirySourceToken(inquiryId);
  const left = Buffer.from(token);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function inquirySourceWindowOpen(createdAt: string, now = Date.now()): boolean {
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false;
  return now <= created + TTL_MS;
}
