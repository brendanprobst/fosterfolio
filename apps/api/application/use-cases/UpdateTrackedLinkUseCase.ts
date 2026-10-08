import { resolveChannel } from '@api/domain/channels/channelPresets';
import {
  normalizeTrackedLinkLabel,
  toTrackedLinkDto,
  type TrackedLinkDto,
} from '@api/application/dtos/trackedLink';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { ITrackedLinkRepository } from '@api/domain/repositories/ITrackedLinkRepository';

export type UpdateTrackedLinkCommand = {
  channelKey?: string | null;
  channelName?: string | null;
  label?: string | null;
  archived?: boolean;
};

export class UpdateTrackedLinkUseCase {
  constructor(private readonly trackedLinkRepository: ITrackedLinkRepository) {}

  async execute(
    actorId: string,
    linkId: string,
    input: UpdateTrackedLinkCommand
  ): Promise<Result<TrackedLinkDto>> {
    const hasLabel = input.label !== undefined;
    const hasChannel = input.channelKey !== undefined || input.channelName !== undefined;
    const hasArchived = input.archived !== undefined;
    if (!linkId?.trim() || (!hasLabel && !hasChannel && !hasArchived)) {
      return Result.failure(ErrorCatalog.TRACKED_LINK_INVALID_INPUT);
    }
    if (hasArchived && typeof input.archived !== 'boolean') {
      return Result.failure(ErrorCatalog.TRACKED_LINK_INVALID_INPUT);
    }
    if (hasLabel && input.label !== null && typeof input.label !== 'string') {
      return Result.failure(ErrorCatalog.TRACKED_LINK_INVALID_INPUT);
    }

    let channel: ReturnType<typeof resolveChannel> = null;
    if (hasChannel) {
      channel = resolveChannel({
        channelKey: input.channelKey,
        channelName: input.channelName,
      });
      if (!channel) {
        return Result.failure(ErrorCatalog.TRACKED_LINK_INVALID_INPUT);
      }
    }

    try {
      const link = await this.trackedLinkRepository.findById(linkId);
      if (!link) {
        return Result.failure(ErrorCatalog.TRACKED_LINK_NOT_FOUND);
      }
      if (link.ownerId !== actorId) {
        return Result.failure(ErrorCatalog.TRACKED_LINK_FORBIDDEN);
      }

      const updated = await this.trackedLinkRepository.update(linkId, {
        ...(channel ? { channelKey: channel.key, channelName: channel.name } : {}),
        ...(hasLabel ? { label: normalizeTrackedLinkLabel(input.label) } : {}),
        ...(hasArchived
          ? {
              archivedAt: input.archived
                ? (link.archivedAt ?? new Date().toISOString())
                : null,
            }
          : {}),
      });
      return Result.success(toTrackedLinkDto(updated));
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
