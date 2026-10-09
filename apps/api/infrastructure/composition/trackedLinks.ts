import { CreateTrackedLinkUseCase } from '@api/application/use-cases/CreateTrackedLinkUseCase';
import { ListChannelsUseCase } from '@api/application/use-cases/ListChannelsUseCase';
import { ListTrackedLinksUseCase } from '@api/application/use-cases/ListTrackedLinksUseCase';
import { ResolveTrackedLinkUseCase } from '@api/application/use-cases/ResolveTrackedLinkUseCase';
import { UpdateTrackedLinkUseCase } from '@api/application/use-cases/UpdateTrackedLinkUseCase';
import type { IAnalyticsDailyRepository } from '@api/domain/repositories/IAnalyticsDailyRepository';
import type { IInquiryRepository } from '@api/domain/repositories/IInquiryRepository';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { ITrackedLinkRepository } from '@api/domain/repositories/ITrackedLinkRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import { InMemoryTrackedLinkRepository } from '@api/infrastructure/repositories/InMemoryTrackedLinkRepository';
import { TrackedLinkRepository } from '@api/infrastructure/repositories/TrackedLinkRepository';

export type TrackedLinksModule = {
  trackedLinkRepository: ITrackedLinkRepository;
  getCreateTrackedLinkUseCase: () => CreateTrackedLinkUseCase;
  getListTrackedLinksUseCase: () => ListTrackedLinksUseCase;
  getUpdateTrackedLinkUseCase: () => UpdateTrackedLinkUseCase;
  getResolveTrackedLinkUseCase: () => ResolveTrackedLinkUseCase;
  getListChannelsUseCase: () => ListChannelsUseCase;
};

export type LinkTotalsPorts = {
  analyticsDailyRepository?: IAnalyticsDailyRepository;
  inquiryRepository?: IInquiryRepository;
};

export function createTrackedLinksModule(
  dataAdapter: DataAdapter | null,
  petRepository: IPetRepository,
  totals: LinkTotalsPorts = {}
): TrackedLinksModule {
  const trackedLinkRepository: ITrackedLinkRepository = dataAdapter
    ? new TrackedLinkRepository(dataAdapter)
    : new InMemoryTrackedLinkRepository();

  return {
    trackedLinkRepository,
    getCreateTrackedLinkUseCase: () =>
      new CreateTrackedLinkUseCase(trackedLinkRepository, petRepository),
    getListTrackedLinksUseCase: () =>
      new ListTrackedLinksUseCase(
        trackedLinkRepository,
        petRepository,
        totals.analyticsDailyRepository,
        totals.inquiryRepository
      ),
    getUpdateTrackedLinkUseCase: () => new UpdateTrackedLinkUseCase(trackedLinkRepository),
    getResolveTrackedLinkUseCase: () => new ResolveTrackedLinkUseCase(trackedLinkRepository),
    getListChannelsUseCase: () => new ListChannelsUseCase(trackedLinkRepository),
  };
}
