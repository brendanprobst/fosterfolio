import { signInquirySourceToken } from '@api/application/inquiries/inquirySourceToken';
import { ensureInquiryReceivedRegistered } from '@api/application/notifications/inquiryReceived';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { IInquiryRepository } from '@api/domain/repositories/IInquiryRepository';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { ITrackedLinkRepository } from '@api/domain/repositories/ITrackedLinkRepository';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import type { TurnstileVerifier } from '@api/infrastructure/adapters/turnstile/verifyTurnstileToken';
import { Logger } from '@api/utils/logger';
import { dispatch, type DispatchDependencies } from '@lattice/notifications';

export type CreateInquiryCommand = {
  targetUserId: string;
  targetPetId?: string | null;
  senderName: string;
  senderEmail: string;
  message: string;
  zipCode?: string | null;
  sourceLinkId?: string | null;
  sourceChannelKey?: string | null;
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type TurnstileGate = {
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
    private readonly turnstile: TurnstileGate
  ) {}

  async execute(input: CreateInquiryCommand): Promise<Result<InquiryDto>> {
    const senderName = input.senderName?.trim() ?? '';
    const senderEmail = input.senderEmail?.trim() ?? '';
    const message = input.message?.trim() ?? '';
    if (!senderName || !senderEmail || !message || !EMAIL_RE.test(senderEmail)) {
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
    if (sourceChannelKey && sourceChannelKey.length > 64) {
      return Result.failure(ErrorCatalog.INQUIRY_INVALID_INPUT);
    }
    const sourceLinkId = normalizeOptional(input.sourceLinkId);

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

      let storedChannel = sourceChannelKey;
      let linkLabel: string | null = null;
      if (sourceLinkId) {
        if (!targetPetId) {
          return Result.failure(ErrorCatalog.INQUIRY_INVALID_INPUT);
        }
        const link = await this.trackedLinkRepository.findById(sourceLinkId);
        if (!link || link.petId !== targetPetId) {
          return Result.failure(ErrorCatalog.INQUIRY_INVALID_INPUT);
        }
        storedChannel = link.channelKey;
        linkLabel = link.label;
      }

      const created = await this.inquiryRepository.create({
        targetUserId: target.id,
        targetPetId,
        senderName,
        senderEmail,
        message,
        zipCode,
        sourceLinkId,
        sourceChannelKey: storedChannel,
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
        sourceToken: signInquirySourceToken(created.id),
      });
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}

function normalizeOptional(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed || null;
}
