import type { IAnalyticsDailyRepository } from '@api/domain/repositories/IAnalyticsDailyRepository';
import type { IInquiryRepository } from '@api/domain/repositories/IInquiryRepository';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import {
  buildPetAnalyticsSummary,
  sinceIsoForDay,
  startDayForRange,
  type PetAnalyticsSummaryDto,
} from '@api/application/analytics/petAnalytics';

export class GetPetAnalyticsSummaryUseCase {
  constructor(
    private readonly petRepository: IPetRepository,
    private readonly analyticsDailyRepository: IAnalyticsDailyRepository,
    private readonly inquiryRepository: IInquiryRepository
  ) {}

  async execute(actorId: string, petId: string): Promise<Result<PetAnalyticsSummaryDto>> {
    if (!petId?.trim()) {
      return Result.failure(ErrorCatalog.PET_NOT_FOUND);
    }
    try {
      const pet = await this.petRepository.findById(petId);
      if (!pet) {
        return Result.failure(ErrorCatalog.PET_NOT_FOUND);
      }
      if (!pet.isOwnedBy(actorId)) {
        return Result.failure(ErrorCatalog.ANALYTICS_FORBIDDEN);
      }
      const sinceDay = startDayForRange('7d');
      const [daily, inquiries] = await Promise.all([
        this.analyticsDailyRepository.listByPetId(petId, sinceDay),
        this.inquiryRepository.listSourcesByPetId(petId, sinceIsoForDay(sinceDay)),
      ]);
      return Result.success(buildPetAnalyticsSummary(daily, inquiries));
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
