import { randomBytes } from 'crypto';
import { CreateInquiryUseCase } from '@api/application/use-cases/CreateInquiryUseCase';
import { ReportInquirySourceUseCase } from '@api/application/use-cases/ReportInquirySourceUseCase';
import type { IInquiryRepository } from '@api/domain/repositories/IInquiryRepository';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { ITrackedLinkRepository } from '@api/domain/repositories/ITrackedLinkRepository';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import type { EmailAdapter } from '@api/infrastructure/adapters/email/EmailAdapter';
import { EmailChannelAdapter } from '@api/infrastructure/adapters/email/EmailChannelAdapter';
import { LoggingEmailAdapter } from '@api/infrastructure/adapters/email/LoggingEmailAdapter';
import { SesEmailAdapter } from '@api/infrastructure/adapters/email/SesEmailAdapter';
import { verifyTurnstileToken } from '@api/infrastructure/adapters/turnstile/verifyTurnstileToken';
import type { INotificationRepository } from '@api/domain/repositories/INotificationRepository';
import { InMemoryInquiryRepository } from '@api/infrastructure/repositories/InMemoryInquiryRepository';
import { InquiryRepository } from '@api/infrastructure/repositories/InquiryRepository';

export type InquiriesModule = {
  inquiryRepository: IInquiryRepository;
  getCreateInquiryUseCase: () => CreateInquiryUseCase;
  getReportInquirySourceUseCase: () => ReportInquirySourceUseCase;
};

export type InquirySecrets = {
  /** null skips Turnstile verification (local dev, Jest, Playwright). */
  turnstileSecret: string | null;
  sourceTokenSecret: string;
};

/** HMAC-SHA256 key. `openssl rand -base64 32` gives 44 characters. */
const MIN_SOURCE_TOKEN_SECRET_LENGTH = 32;

/** Outside production only. A fresh key per process, so no signing key lives in the repo. */
const DEV_SOURCE_TOKEN_SECRET = randomBytes(32).toString('base64url');

/**
 * Production fails closed: the API refuses to start without both secrets, like the Supabase check
 * in `Container`. Skipping Turnstile or signing with a known key must never happen silently.
 */
export function readInquirySecrets(env: NodeJS.ProcessEnv = process.env): InquirySecrets {
  const turnstileSecret = env.TURNSTILE_SECRET_KEY?.trim() || null;
  const sourceTokenSecret = env.INQUIRY_SOURCE_TOKEN_SECRET?.trim() || null;
  if (env.NODE_ENV === 'production') {
    if (!turnstileSecret || !sourceTokenSecret) {
      const missing = [
        turnstileSecret ? null : 'TURNSTILE_SECRET_KEY',
        sourceTokenSecret ? null : 'INQUIRY_SOURCE_TOKEN_SECRET',
      ].filter((name) => name !== null);
      throw new Error(`${missing.join(' and ')} required when NODE_ENV=production`);
    }
    if (sourceTokenSecret.length < MIN_SOURCE_TOKEN_SECRET_LENGTH) {
      throw new Error(
        `INQUIRY_SOURCE_TOKEN_SECRET must be at least ${MIN_SOURCE_TOKEN_SECRET_LENGTH} characters`
      );
    }
  }
  return {
    turnstileSecret,
    sourceTokenSecret: sourceTokenSecret ?? DEV_SOURCE_TOKEN_SECRET,
  };
}

function createEmailAdapter(): EmailAdapter {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (provider === 'ses') {
    return new SesEmailAdapter();
  }
  return new LoggingEmailAdapter();
}

export function createInquiriesModule(
  dataAdapter: DataAdapter | null,
  userRepository: IUserRepository,
  petRepository: IPetRepository,
  trackedLinkRepository: ITrackedLinkRepository,
  notificationRepository: INotificationRepository,
  emailAdapter: EmailAdapter = createEmailAdapter(),
  secrets: InquirySecrets = readInquirySecrets()
): InquiriesModule {
  const inquiryRepository: IInquiryRepository = dataAdapter
    ? new InquiryRepository(dataAdapter)
    : new InMemoryInquiryRepository();

  return {
    inquiryRepository,
    getCreateInquiryUseCase: () =>
      new CreateInquiryUseCase(
        inquiryRepository,
        userRepository,
        petRepository,
        {
          inApp: notificationRepository,
          email: new EmailChannelAdapter(emailAdapter),
          preferences: notificationRepository,
        },
        trackedLinkRepository,
        {
          getSecret: () => secrets.turnstileSecret,
          verify: verifyTurnstileToken,
        },
        secrets.sourceTokenSecret
      ),
    getReportInquirySourceUseCase: () =>
      new ReportInquirySourceUseCase(inquiryRepository, secrets.sourceTokenSecret),
  };
}
