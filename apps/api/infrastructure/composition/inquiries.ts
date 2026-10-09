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
  emailAdapter: EmailAdapter = createEmailAdapter()
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
          getSecret: () => process.env.TURNSTILE_SECRET_KEY?.trim() || null,
          verify: verifyTurnstileToken,
        }
      ),
    getReportInquirySourceUseCase: () => new ReportInquirySourceUseCase(inquiryRepository),
  };
}
