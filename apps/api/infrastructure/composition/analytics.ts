import { GetOwnerLinkAnalyticsUseCase } from '@api/application/use-cases/GetOwnerLinkAnalyticsUseCase';
import { GetPetAnalyticsUseCase } from '@api/application/use-cases/GetPetAnalyticsUseCase';
import type { IAnalyticsDailyRepository } from '@api/domain/repositories/IAnalyticsDailyRepository';
import type { IAnalyticsOwnerDailyRepository } from '@api/domain/repositories/IAnalyticsOwnerDailyRepository';
import type { IInquiryRepository } from '@api/domain/repositories/IInquiryRepository';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import { AnalyticsDailyRepository } from '@api/infrastructure/repositories/AnalyticsDailyRepository';
import { AnalyticsOwnerDailyRepository } from '@api/infrastructure/repositories/AnalyticsOwnerDailyRepository';
import { InMemoryAnalyticsDailyRepository } from '@api/infrastructure/repositories/InMemoryAnalyticsDailyRepository';
import { InMemoryAnalyticsOwnerDailyRepository } from '@api/infrastructure/repositories/InMemoryAnalyticsOwnerDailyRepository';

export type AnalyticsModule = {
  analyticsDailyRepository: IAnalyticsDailyRepository;
  analyticsOwnerDailyRepository: IAnalyticsOwnerDailyRepository;
  getGetPetAnalyticsUseCase: () => GetPetAnalyticsUseCase;
  getGetOwnerLinkAnalyticsUseCase: () => GetOwnerLinkAnalyticsUseCase;
};

export function createAnalyticsModule(
  dataAdapter: DataAdapter | null,
  petRepository: IPetRepository,
  inquiryRepository: IInquiryRepository
): AnalyticsModule {
  const analyticsDailyRepository: IAnalyticsDailyRepository = dataAdapter
    ? new AnalyticsDailyRepository(dataAdapter)
    : new InMemoryAnalyticsDailyRepository();
  const analyticsOwnerDailyRepository: IAnalyticsOwnerDailyRepository = dataAdapter
    ? new AnalyticsOwnerDailyRepository(dataAdapter)
    : new InMemoryAnalyticsOwnerDailyRepository();

  return {
    analyticsDailyRepository,
    analyticsOwnerDailyRepository,
    getGetPetAnalyticsUseCase: () =>
      new GetPetAnalyticsUseCase(petRepository, analyticsDailyRepository, inquiryRepository),
    getGetOwnerLinkAnalyticsUseCase: () =>
      new GetOwnerLinkAnalyticsUseCase(analyticsOwnerDailyRepository, inquiryRepository),
  };
}
