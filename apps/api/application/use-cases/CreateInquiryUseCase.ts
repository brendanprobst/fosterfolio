import { signInquirySourceToken } from '@api/application/inquiries/inquirySourceToken';
import { ensureInquiryReceivedRegistered } from '@api/application/notifications/inquiryReceived';
import {
  CHANNEL_KEY_MAX_LENGTH,
  charLength,
  isKnownChannelKey,
  isSystemChannelKey,
} from '@api/domain/channels/channelPresets';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { IInquiryRepository } from '@api/domain/repositories/IInquiryRepository';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type {
  ITrackedLinkRepository,
  TrackedLinkRecord,
} from '@api/domain/repositories/ITrackedLinkRepository';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import { linkCreditsInquiry } from '@api/domain/trackedLinks/linkCreditsInquiry';
import { isValidEmailAddress } from '@api/domain/value-objects/EmailAddress';
import { isUuid } from '@api/domain/value-objects/UserHandle';
import type { TurnstileVerifier } from '@api/infrastructure/adapters/turnstile/verifyTurnstileToken';
import { Logger } from '@api/utils/logger';
import { dispatch, type DispatchDependencies } from '@lattice/notifications';
import { logUnexpectedError } from '@api/utils/logUnexpectedError';

export type CreateInquiryCommand = {
  targetUserId: string;
  targetPetId?: string | null;
  senderName: string;
  senderEmail: string;
  message: string;
  zipCode?: string | null;
  sourceLinkId?: string | null;
  sourceChannelKey?: string | null;
  viaFosterMe?: boolean;
  turnstileToken?: string | null;
};

export type InquiryDto = {
  id: string;
  targetUserId: string;
  targetPetId: string | null;
  senderName: string;
  senderEmail: string;
  message: string;
  createdAt: string;
  sourceToken: string;
};

export type TurnstileGate = {
  /** null skips verification. Composition only allows that outside production. */
  getSecret: () => string | null;
  verify: TurnstileVerifier;
};

export class CreateInquiryUseCase {
  constructor(
    private readonly inquiryRepository: IInquiryRepository,
    private readonly userRepository: IUserRepository,
    private readonly petRepository: IPetRepository,
    private readonly notifications: DispatchDependencies,
    private readonly trackedLinkRepository: ITrackedLinkRepository,
    private readonly turnstile: TurnstileGate,
    private readonly sourceTokenSecret: string
  ) {}

  async execute(input: CreateInquiryCommand): Promise<Result<InquiryDto>> {
    if (!hasOptionalStringFields(input)) {
      return Result.failure(ErrorCatalog.INQUIRY_INVALID_INPUT);
    }
    const senderName = input.senderName?.trim() ?? '';
    const senderEmail = input.senderEmail?.trim() ?? '';
    const message = input.message?.trim() ?? '';
    if (!senderName || !senderEmail || !message || !isValidEmailAddress(senderEmail)) {
      return Result.failure(ErrorCatalog.INQUIRY_INVALID_INPUT);
    }
    if (!input.targetUserId?.trim()) {
      return Result.failure(ErrorCatalog.INQUIRY_INVALID_INPUT);
    }

    const zipCode = normalizeOptional(input.zipCode);
    if (zipCode && zipCode.length > 20) {
      return Result.failure(ErrorCatalog.INQUIRY_INVALID_INPUT);
    }
    const sourceChannelKey = normalizeOptional(input.sourceChannelKey);
    const sourceLinkId = normalizeOptional(input.sourceLinkId);
    if (input.viaFosterMe != null && typeof input.viaFosterMe !== 'boolean') {
      return Result.failure(ErrorCatalog.INQUIRY_INVALID_INPUT);
    }
    const viaFosterMe = input.viaFosterMe === true;

    try {
      const secret = this.turnstile.getSecret();
      if (secret) {
        const token = input.turnstileToken?.trim() ?? '';
        if (!token || !(await this.turnstile.verify(token, secret))) {
          return Result.failure(ErrorCatalog.INQUIRY_TURNSTILE_FAILED);
        }
      }

      const target = await this.userRepository.findById(input.targetUserId);
      if (!target) {
        return Result.failure(ErrorCatalog.INQUIRY_TARGET_NOT_FOUND);
      }

      let targetPetId: string | null = input.targetPetId ?? null;
      let petName: string | null = null;
      if (targetPetId) {
        const pet = await this.petRepository.findById(targetPetId);
        if (!pet || pet.ownerId !== target.id) {
          return Result.failure(ErrorCatalog.INQUIRY_INVALID_INPUT);
        }
        petName = pet.toListDto().name;
      }

      const sourceLink = sourceLinkId
        ? await this.findCreditedLink(sourceLinkId, target.id, targetPetId)
        : null;
      const storedChannel =
        sourceLink?.channelKey ?? (await this.knownChannelKey(sourceChannelKey, target.id));
      const linkLabel = sourceLink?.label ?? null;

      const created = await this.inquiryRepository.create({
        targetUserId: target.id,
        targetPetId,
        senderName,
        senderEmail,
        message,
        zipCode,
        sourceLinkId: sourceLink?.id ?? null,
        sourceChannelKey: storedChannel,
        viaFosterMe,
      });

      ensureInquiryReceivedRegistered();
      try {
        await dispatch(this.notifications, {
          recipientId: target.id,
          recipientEmail: target.email,
          type: 'inquiry_received',
          payload: {
            senderName,
            senderEmail,
            zip: zipCode,
            message,
            petId: targetPetId,
            petName,
            sourceChannelKey: storedChannel,
            linkLabel,
            selfReportedSource: null,
          },
          entityRef: { entityType: 'inquiry', entityId: created.id },
        });
      } catch (error) {
        Logger.warning(
          `[inquiry] notification dispatch failed after persist (${error instanceof Error ? error.message : 'unknown'})`
        );
      }

      return Result.success({
        id: created.id,
        targetUserId: created.targetUserId,
        targetPetId: created.targetPetId,
        senderName: created.senderName,
        senderEmail: created.senderEmail,
        message: created.message,
        createdAt: created.createdAt,
        sourceToken: signInquirySourceToken(created.id, this.sourceTokenSecret),
      });
    } catch (error) {
      logUnexpectedError('CreateInquiryUseCase', error);
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Attribution must never block contact: a link that can't be credited is dropped and the
   * inquiry is saved without it. The id comes from the visitor's browser, so it's untrusted.
   */
  private async findCreditedLink(
    linkId: string,
    ownerId: string,
    petId: string | null
  ): Promise<TrackedLinkRecord | null> {
    // A malformed id would make the uuid column lookup throw, failing the whole inquiry.
    const link = isUuid(linkId) ? await this.trackedLinkRepository.findById(linkId) : null;
    if (link && linkCreditsInquiry(link, { ownerId, petId })) return link;
    Logger.warning('[inquiry] source link not credited; saving the inquiry without it');
    return null;
  }

  /**
   * With no credited link, the channel key is whatever the browser sent. Keep it only when it's
   * a system key or one of this owner's channels (archived included), the same rule the rollup
   * applies. Anything else would add a made-up row to the owner's byChannel. Like the link, an
   * unknown key is dropped rather than failing the inquiry.
   */
  private async knownChannelKey(key: string | null, ownerId: string): Promise<string | null> {
    if (!key || charLength(key) > CHANNEL_KEY_MAX_LENGTH) return null;
    if (isSystemChannelKey(key)) return key;
    const pairs = await this.trackedLinkRepository.listChannelPairsByOwner(ownerId);
    const ownerKeys = new Set(pairs.map((pair) => pair.channelKey));
    return isKnownChannelKey(key, ownerKeys) ? key : null;
  }
}

const OPTIONAL_STRING_FIELDS = [
  'targetPetId',
  'zipCode',
  'sourceLinkId',
  'sourceChannelKey',
  'turnstileToken',
] as const;

/** The controller passes these through from the JSON body untyped. A number or object would throw on `.trim()`. */
function hasOptionalStringFields(input: CreateInquiryCommand): boolean {
  return OPTIONAL_STRING_FIELDS.every((field) => {
    const value: unknown = input[field];
    return value == null || typeof value === 'string';
  });
}

function normalizeOptional(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed || null;
}
