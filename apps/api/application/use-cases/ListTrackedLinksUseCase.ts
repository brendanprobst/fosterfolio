import { toTrackedLinkDto, type TrackedLinkDto } from '@api/application/dtos/trackedLink';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { IAnalyticsDailyRepository } from '@api/domain/repositories/IAnalyticsDailyRepository';
import type { IInquiryRepository } from '@api/domain/repositories/IInquiryRepository';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { ITrackedLinkRepository } from '@api/domain/repositories/ITrackedLinkRepository';

export class ListTrackedLinksUseCase {
  constructor(
    private readonly trackedLinkRepository: ITrackedLinkRepository,
    private readonly petRepository: IPetRepository,
    private readonly analyticsDailyRepository?: IAnalyticsDailyRepository,
    private readonly inquiryRepository?: IInquiryRepository
  ) {}

  async execute(actorId: string, petId: string): Promise<Result<TrackedLinkDto[]>> {
    if (!petId?.trim()) {
      return Result.failure(ErrorCatalog.TRACKED_LINK_INVALID_INPUT);
    }
    try {
      const pet = await this.petRepository.findById(petId);
      if (!pet) {
        return Result.failure(ErrorCatalog.PET_NOT_FOUND);
      }
      if (!pet.isOwnedBy(actorId)) {
        return Result.failure(ErrorCatalog.TRACKED_LINK_FORBIDDEN);
      }
      const links = await this.trackedLinkRepository.listByPetId(petId);
      const linkIds = links.map((link) => link.id);
      const [viewTotals, inquiryTotals] = await Promise.all([
        this.analyticsDailyRepository?.sumViewsByLinkIds(linkIds) ?? new Map<string, number>(),
        this.inquiryRepository?.countBySourceLinkIds(linkIds) ?? new Map<string, number>(),
      ]);
      return Result.success(
        links.map((link) =>
          toTrackedLinkDto(link, {
            views: viewTotals.get(link.id) ?? 0,
            inquiries: inquiryTotals.get(link.id) ?? 0,
          })
        )
      );
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
