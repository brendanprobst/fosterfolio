import { signInquirySourceToken } from '@api/application/inquiries/inquirySourceToken';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { IInquiryRepository } from '@api/domain/repositories/IInquiryRepository';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { ITrackedLinkRepository } from '@api/domain/repositories/ITrackedLinkRepository';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import type { TurnstileVerifier } from '@api/infrastructure/adapters/turnstile/verifyTurnstileToken';
import type { EmailAdapter } from '@api/infrastructure/adapters/email/EmailAdapter';
import { Logger } from '@api/utils/logger';

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
    private readonly emailAdapter: EmailAdapter,
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
      if (sourceLinkId) {
        if (!targetPetId) {
          return Result.failure(ErrorCatalog.INQUIRY_INVALID_INPUT);
        }
        const link = await this.trackedLinkRepository.findById(sourceLinkId);
        if (!link || link.petId !== targetPetId) {
          return Result.failure(ErrorCatalog.INQUIRY_INVALID_INPUT);
        }
        storedChannel = link.channelKey;
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

      const subject = petName
        ? `Fosterfolio inquiry about ${petName}`
        : 'Fosterfolio inquiry';
      const text = [
        `You have a new inquiry on Fosterfolio.`,
        petName ? `Pet: ${petName}` : null,
        `From: ${senderName} <${senderEmail}>`,
        '',
        message,
      ]
        .filter((line) => line !== null)
        .join('\n');

      try {
        await this.emailAdapter.send({
          to: target.email,
          subject,
          text,
          replyTo: senderEmail,
        });
      } catch (error) {
        Logger.warning(
          `[inquiry] email failed after persist (${error instanceof Error ? error.message : 'unknown'})`
        );
        return Result.failure(ErrorCatalog.INQUIRY_EMAIL_FAILED);
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
