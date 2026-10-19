import {
  RESERVED_CHANNEL_KEY,
  RESERVED_CHANNEL_NAME,
  resolveChannel,
} from '@api/domain/channels/channelPresets';
import {
  normalizeTrackedLinkLabel,
  toTrackedLinkDto,
  type TrackedLinkDto,
} from '@api/application/dtos/trackedLink';
import { TrackedLink } from '@api/domain/entities/TrackedLink';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { ITrackedLinkRepository } from '@api/domain/repositories/ITrackedLinkRepository';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import { generateTrackedLinkCode } from '@api/domain/trackedLinks/generateTrackedLinkCode';
import {
  defaultLinkLabel,
  isValidTrackedLinkLabel,
} from '@api/domain/trackedLinks/trackedLinkLabel';

export type CreateOwnerLinkCommand = {
  channelKey?: string | null;
  channelName?: string | null;
  label?: string | null;
  isDefault?: boolean;
};

const CODE_ATTEMPTS = 5;

export class CreateOwnerLinkUseCase {
  constructor(
    private readonly trackedLinkRepository: ITrackedLinkRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(actorId: string, input: CreateOwnerLinkCommand): Promise<Result<TrackedLinkDto>> {
    if (!actorId?.trim()) {
      return Result.failure(ErrorCatalog.TRACKED_LINK_INVALID_INPUT);
    }
    if (!isValidTrackedLinkLabel(input.label)) {
      return Result.failure(ErrorCatalog.TRACKED_LINK_INVALID_INPUT);
    }
    if (input.isDefault != null && typeof input.isDefault !== 'boolean') {
      return Result.failure(ErrorCatalog.TRACKED_LINK_INVALID_INPUT);
    }

    const shaped = TrackedLink.create('foster_me', null);
    if (!shaped) {
      return Result.failure(ErrorCatalog.TRACKED_LINK_INVALID_INPUT);
    }

    let channelKey: string;
    let channelName: string;
    let label: string | null;

    try {
      if (input.isDefault) {
        const existing = await this.trackedLinkRepository.findActiveDefaultByOwner(actorId);
        if (existing) {
          return Result.failure(ErrorCatalog.TRACKED_LINK_DEFAULT_EXISTS);
        }
        const user = await this.userRepository.findById(actorId);
        const displayName = user?.toPublicDto().displayName?.trim() || 'Foster';
        channelKey = RESERVED_CHANNEL_KEY;
        channelName = RESERVED_CHANNEL_NAME;
        label = defaultLinkLabel(displayName);
      } else {
        const channel = resolveChannel({
          channelKey: input.channelKey,
          channelName: input.channelName,
        });
        if (!channel) {
          return Result.failure(ErrorCatalog.TRACKED_LINK_INVALID_INPUT);
        }
        channelKey = channel.key;
        channelName = channel.name;
        label = normalizeTrackedLinkLabel(input.label);
      }

      for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
        const code = generateTrackedLinkCode();
        const existing = await this.trackedLinkRepository.findByCode(code);
        if (existing) continue;
        const created = await this.trackedLinkRepository.create({
          target: shaped.target,
          petId: shaped.petId,
          ownerId: actorId,
          code,
          channelKey,
          channelName,
          label,
        });
        return Result.success(toTrackedLinkDto(created));
      }
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
