import {
  buildOwnerLinkAnalytics,
  type OwnerLinkAnalyticsDto,
} from '@api/application/analytics/ownerLinkAnalytics';
import {
  parseAnalyticsRange,
  sinceIsoForDay,
  startDayForRange,
} from '@api/application/analytics/petAnalytics';
import type { IAnalyticsOwnerDailyRepository } from '@api/domain/repositories/IAnalyticsOwnerDailyRepository';
import type { IInquiryRepository } from '@api/domain/repositories/IInquiryRepository';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import { logUnexpectedError } from '@api/utils/logUnexpectedError';

export class GetOwnerLinkAnalyticsUseCase {
  constructor(
    private readonly analyticsOwnerDailyRepository: IAnalyticsOwnerDailyRepository,
    private readonly inquiryRepository: IInquiryRepository
  ) {}

  async execute(
    actorId: string,
    rangeRaw: string | undefined
  ): Promise<Result<OwnerLinkAnalyticsDto>> {
    const range = parseAnalyticsRange(rangeRaw);
    if (!range) {
      return Result.failure(ErrorCatalog.ANALYTICS_INVALID_RANGE);
    }
    try {
      const sinceDay = startDayForRange(range);
      const [daily, inquiries] = await Promise.all([
        this.analyticsOwnerDailyRepository.listByOwnerId(actorId, sinceDay),
        this.inquiryRepository.listFosterMeSourcesByOwner(actorId, sinceIsoForDay(sinceDay)),
      ]);
      return Result.success(buildOwnerLinkAnalytics(daily, inquiries));
    } catch (error) {
      logUnexpectedError('GetOwnerLinkAnalyticsUseCase', error);
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
