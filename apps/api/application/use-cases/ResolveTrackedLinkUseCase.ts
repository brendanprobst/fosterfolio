import type { ResolvedTrackedLinkDto } from '@api/application/dtos/trackedLink';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { ITrackedLinkRepository } from '@api/domain/repositories/ITrackedLinkRepository';

export class ResolveTrackedLinkUseCase {
  constructor(private readonly trackedLinkRepository: ITrackedLinkRepository) {}

  async execute(code: string): Promise<Result<ResolvedTrackedLinkDto>> {
    const trimmed = code?.trim() ?? '';
    if (!trimmed) {
      return Result.failure(ErrorCatalog.TRACKED_LINK_NOT_FOUND);
    }
    try {
      const link = await this.trackedLinkRepository.findByCode(trimmed);
      if (!link) {
        return Result.failure(ErrorCatalog.TRACKED_LINK_NOT_FOUND);
      }
      return Result.success({
        linkId: link.id,
        channelKey: link.channelKey,
        petId: link.petId,
      });
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
