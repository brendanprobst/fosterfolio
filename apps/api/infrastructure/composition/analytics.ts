import { GetPetAnalyticsSummaryUseCase } from '@api/application/use-cases/GetPetAnalyticsSummaryUseCase';
import { GetPetAnalyticsUseCase } from '@api/application/use-cases/GetPetAnalyticsUseCase';
import type { IAnalyticsDailyRepository } from '@api/domain/repositories/IAnalyticsDailyRepository';
import type { IInquiryRepository } from '@api/domain/repositories/IInquiryRepository';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import { AnalyticsDailyRepository } from '@api/infrastructure/repositories/AnalyticsDailyRepository';
import { InMemoryAnalyticsDailyRepository } from '@api/infrastructure/repositories/InMemoryAnalyticsDailyRepository';

export type AnalyticsModule = {
  analyticsDailyRepository: IAnalyticsDailyRepository;
  getGetPetAnalyticsUseCase: () => GetPetAnalyticsUseCase;
  getGetPetAnalyticsSummaryUseCase: () => GetPetAnalyticsSummaryUseCase;
};

export function createAnalyticsModule(
  dataAdapter: DataAdapter | null,
  petRepository: IPetRepository,
  inquiryRepository: IInquiryRepository
): AnalyticsModule {
  const analyticsDailyRepository: IAnalyticsDailyRepository = dataAdapter
    ? new AnalyticsDailyRepository(dataAdapter)
    : new InMemoryAnalyticsDailyRepository();

  return {
    analyticsDailyRepository,
    getGetPetAnalyticsUseCase: () =>
      new GetPetAnalyticsUseCase(petRepository, analyticsDailyRepository, inquiryRepository),
    getGetPetAnalyticsSummaryUseCase: () =>
      new GetPetAnalyticsSummaryUseCase(
        petRepository,
        analyticsDailyRepository,
        inquiryRepository
      ),
  };
}
