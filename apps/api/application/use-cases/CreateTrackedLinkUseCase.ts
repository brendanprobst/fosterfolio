import { resolveChannel } from '@api/domain/channels/channelPresets';
import { TrackedLink } from '@api/domain/entities/TrackedLink';
import {
  normalizeTrackedLinkLabel,
  toTrackedLinkDto,
  type TrackedLinkDto,
} from '@api/application/dtos/trackedLink';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { ITrackedLinkRepository } from '@api/domain/repositories/ITrackedLinkRepository';
import { generateTrackedLinkCode } from '@api/domain/trackedLinks/generateTrackedLinkCode';

export type CreateTrackedLinkCommand = {
  channelKey?: string | null;
  channelName?: string | null;
  label?: string | null;
};

const CODE_ATTEMPTS = 5;

export class CreateTrackedLinkUseCase {
  constructor(
    private readonly trackedLinkRepository: ITrackedLinkRepository,
    private readonly petRepository: IPetRepository
  ) {}

  async execute(
    actorId: string,
    petId: string,
    input: CreateTrackedLinkCommand
  ): Promise<Result<TrackedLinkDto>> {
    const channel = resolveChannel({
      channelKey: input.channelKey,
      channelName: input.channelName,
    });
    if (!channel || !petId?.trim()) {
      return Result.failure(ErrorCatalog.TRACKED_LINK_INVALID_INPUT);
    }
    if (input.label != null && typeof input.label !== 'string') {
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

      for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
        const code = generateTrackedLinkCode();
        const existing = await this.trackedLinkRepository.findByCode(code);
        if (existing) continue;
        const shaped = TrackedLink.create('pet', pet.id);
        if (!shaped) {
          return Result.failure(ErrorCatalog.TRACKED_LINK_INVALID_INPUT);
        }
        const created = await this.trackedLinkRepository.create({
          target: shaped.target,
          petId: shaped.petId,
          ownerId: actorId,
          code,
          channelKey: channel.key,
          channelName: channel.name,
          label: normalizeTrackedLinkLabel(input.label),
        });
        return Result.success(toTrackedLinkDto(created));
      }
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
