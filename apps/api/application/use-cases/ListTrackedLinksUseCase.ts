import { toTrackedLinkDto, type TrackedLinkDto } from '@api/application/dtos/trackedLink';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { ITrackedLinkRepository } from '@api/domain/repositories/ITrackedLinkRepository';

export class ListTrackedLinksUseCase {
  constructor(
    private readonly trackedLinkRepository: ITrackedLinkRepository,
    private readonly petRepository: IPetRepository
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
      return Result.success(links.map(toTrackedLinkDto));
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
