import { CHANNEL_PRESETS, isSystemChannelKey } from '@api/domain/channels/channelPresets';
import type { ChannelOptionDto } from '@api/application/dtos/trackedLink';
import { Result } from '@api/domain/errors/Result';
import type { ITrackedLinkRepository } from '@api/domain/repositories/ITrackedLinkRepository';

export class ListChannelsUseCase {
  constructor(private readonly trackedLinkRepository: ITrackedLinkRepository) {}

  async execute(ownerId: string): Promise<Result<ChannelOptionDto[]>> {
    const presets: ChannelOptionDto[] = CHANNEL_PRESETS.map((preset) => ({
      key: preset.key,
      name: preset.name,
      isPreset: true,
    }));
    try {
      const pairs = ownerId?.trim()
        ? await this.trackedLinkRepository.listChannelPairsByOwner(ownerId)
        : [];
      // Pairs arrive oldest first: the first link fixes the position, the newest name wins.
      const custom = new Map<string, ChannelOptionDto>();
      for (const pair of pairs) {
        if (isSystemChannelKey(pair.channelKey)) continue;
        custom.set(pair.channelKey, {
          key: pair.channelKey,
          name: pair.channelName,
          isPreset: false,
        });
      }
      return Result.success([...presets, ...custom.values()]);
    } catch {
      return Result.success(presets);
    }
  }
}
