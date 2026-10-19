import { isKnownChannelKey } from '@api/domain/channels/channelPresets';
import type { AnalyticsDailyWrite } from '@api/domain/repositories/IAnalyticsDailyRepository';
import type { AnalyticsOwnerDailyWrite } from '@api/domain/repositories/IAnalyticsOwnerDailyRepository';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { ITrackedLinkRepository } from '@api/domain/repositories/ITrackedLinkRepository';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import { isUuid } from '@api/domain/value-objects/UserHandle';

export type RollupSkipReason =
  | 'malformed'
  | 'unknown_pet'
  | 'unknown_owner'
  | 'foreign_link'
  | 'unknown_channel';

export type RollupSkipCounts = Partial<Record<RollupSkipReason, number>>;

export type VerifiedRollupRows = {
  petRows: AnalyticsDailyWrite[];
  ownerRows: AnalyticsOwnerDailyWrite[];
  skipped: RollupSkipCounts;
};

/**
 * Anyone holding the public PostHog token can send events with any pet, owner, link or
 * channel, and the rollup writes with the service role. A row is kept only when its pet
 * (or owner) is active, its link belongs to that owner, and its channel is one the owner
 * could have produced. A link from another of the owner's pets is kept: first-touch
 * attribution follows the visitor across that owner's pages.
 */
export class RollupRowVerifier {
  constructor(
    private readonly petRepository: IPetRepository,
    private readonly userRepository: IUserRepository,
    private readonly trackedLinkRepository: ITrackedLinkRepository
  ) {}

  async verify(input: {
    petRows: AnalyticsDailyWrite[];
    ownerRows: AnalyticsOwnerDailyWrite[];
  }): Promise<VerifiedRollupRows> {
    const skipped: RollupSkipCounts = {};
    const skip = (reason: RollupSkipReason) => {
      skipped[reason] = (skipped[reason] ?? 0) + 1;
    };
    // Malformed ids would fail the uuid column filters and abort the lookup.
    const wellFormed = (row: { linkId: string | null }, id: string) => {
      if (isUuid(id) && (row.linkId === null || isUuid(row.linkId))) return true;
      skip('malformed');
      return false;
    };
    const petRows = input.petRows.filter((row) => wellFormed(row, row.petId));
    const ownerRows = input.ownerRows.filter((row) => wellFormed(row, row.ownerId));

    const petOwners = await this.petRepository.listOwnerIdsByIds(petRows.map((row) => row.petId));
    const activeOwners = await this.userRepository.listActiveIds(
      ownerRows.map((row) => row.ownerId)
    );
    const links = await this.trackedLinkRepository.listByOwnerIds([
      ...new Set([...petOwners.values(), ...activeOwners]),
    ]);
    const linkOwners = new Map(links.map((link) => [link.id, link.ownerId]));
    const channelKeys = new Map<string, Set<string>>();
    for (const link of links) {
      const keys = channelKeys.get(link.ownerId) ?? new Set<string>();
      keys.add(link.channelKey);
      channelKeys.set(link.ownerId, keys);
    }

    const trusted = (
      row: { linkId: string | null; channelKey: string },
      ownerId: string
    ): boolean => {
      if (row.linkId !== null && linkOwners.get(row.linkId) !== ownerId) {
        skip('foreign_link');
        return false;
      }
      if (!isKnownChannelKey(row.channelKey, channelKeys.get(ownerId) ?? new Set())) {
        skip('unknown_channel');
        return false;
      }
      return true;
    };

    return {
      petRows: petRows.filter((row) => {
        const ownerId = petOwners.get(row.petId);
        if (!ownerId) {
          skip('unknown_pet');
          return false;
        }
        return trusted(row, ownerId);
      }),
      ownerRows: ownerRows.filter((row) => {
        if (!activeOwners.has(row.ownerId)) {
          skip('unknown_owner');
          return false;
        }
        return trusted(row, row.ownerId);
      }),
      skipped,
    };
  }
}
