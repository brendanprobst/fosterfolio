import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { IInquiryRepository } from '@api/domain/repositories/IInquiryRepository';
import type { IPetRepository } from '@api/domain/repositories/IPetRepository';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import type { EmailAdapter } from '@api/infrastructure/adapters/email/EmailAdapter';
import { Logger } from '@api/utils/logger';

export type CreateInquiryCommand = {
  targetUserId: string;
  targetPetId?: string | null;
  senderName: string;
  senderEmail: string;
  message: string;
};

export type InquiryDto = {
  id: string;
  targetUserId: string;
  targetPetId: string | null;
  senderName: string;
  senderEmail: string;
  message: string;
  createdAt: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class CreateInquiryUseCase {
  constructor(
    private readonly inquiryRepository: IInquiryRepository,
    private readonly userRepository: IUserRepository,
    private readonly petRepository: IPetRepository,
    private readonly emailAdapter: EmailAdapter
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

    try {
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

      const created = await this.inquiryRepository.create({
        targetUserId: target.id,
        targetPetId,
        senderName,
        senderEmail,
        message,
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

      return Result.success(created);
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
