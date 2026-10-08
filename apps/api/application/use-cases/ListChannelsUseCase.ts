import { CHANNEL_PRESETS } from '@api/domain/channels/channelPresets';
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
      const seen = new Set<string>();
      const custom: ChannelOptionDto[] = [];
      for (const pair of pairs) {
        if (CHANNEL_PRESETS.some((preset) => preset.key === pair.channelKey)) {
          continue;
        }
        const id = `${pair.channelKey}\0${pair.channelName}`;
        if (seen.has(id)) continue;
        seen.add(id);
        custom.push({
          key: pair.channelKey,
          name: pair.channelName,
          isPreset: false,
        });
      }
      return Result.success([...presets, ...custom]);
    } catch {
      return Result.success(presets);
    }
  }
}
