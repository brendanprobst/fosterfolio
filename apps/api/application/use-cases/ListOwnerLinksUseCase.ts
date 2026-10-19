import { toTrackedLinkDto, type TrackedLinkDto } from '@api/application/dtos/trackedLink';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { ITrackedLinkRepository } from '@api/domain/repositories/ITrackedLinkRepository';

export class ListOwnerLinksUseCase {
  constructor(
    private readonly trackedLinkRepository: ITrackedLinkRepository,
    private readonly petRepository: IPetRepository
  ) {}

  async execute(actorId: string): Promise<Result<TrackedLinkDto[]>> {
    if (!actorId?.trim()) {
      return Result.failure(ErrorCatalog.TRACKED_LINK_INVALID_INPUT);
    }
    try {
      const [links, pets] = await Promise.all([
        this.trackedLinkRepository.listByOwnerId(actorId),
        this.petRepository.listByOwnerId(actorId),
      ]);
      const names = new Map(pets.map((pet) => [pet.toOwnerDto().id, pet.toOwnerDto().name]));
      return Result.success(
        links.map((link) =>
          toTrackedLinkDto(
            link,
            { views: 0, inquiries: 0 },
            link.target === 'pet' ? (names.get(link.petId ?? '') ?? null) : null
          )
        )
      );
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
