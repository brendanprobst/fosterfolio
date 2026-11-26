import type { IAnalyticsDailyRepository } from '@api/domain/repositories/IAnalyticsDailyRepository';
import type { IInquiryRepository } from '@api/domain/repositories/IInquiryRepository';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import {
  buildPetAnalytics,
  parseAnalyticsRange,
  sinceIsoForDay,
  startDayForRange,
  type PetAnalyticsDto,
} from '@api/application/analytics/petAnalytics';
import { logUnexpectedError } from '@api/utils/logUnexpectedError';

export class GetPetAnalyticsUseCase {
  constructor(
    private readonly petRepository: IPetRepository,
    private readonly analyticsDailyRepository: IAnalyticsDailyRepository,
    private readonly inquiryRepository: IInquiryRepository
  ) {}

  async execute(
    actorId: string,
    petId: string,
    rangeRaw: string | undefined
  ): Promise<Result<PetAnalyticsDto>> {
    const range = parseAnalyticsRange(rangeRaw);
    if (!range) {
      return Result.failure(ErrorCatalog.ANALYTICS_INVALID_RANGE);
    }
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
      const sinceDay = startDayForRange(range);
      const [daily, inquiries] = await Promise.all([
        this.analyticsDailyRepository.listByPetId(petId, sinceDay),
        this.inquiryRepository.listSourcesByPetId(petId, sinceIsoForDay(sinceDay)),
      ]);
      return Result.success(buildPetAnalytics(daily, inquiries));
    } catch (error) {
      logUnexpectedError('GetPetAnalyticsUseCase', error);
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
