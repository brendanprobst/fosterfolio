import {
  inquirySourceTokenMatches,
  inquirySourceWindowOpen,
} from '@api/application/inquiries/inquirySourceToken';
import { isSelfReportedSource } from '@api/application/inquiries/selfReportedSources';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Result } from '@api/domain/errors/Result';
import type { IInquiryRepository } from '@api/domain/repositories/IInquiryRepository';

export type ReportInquirySourceCommand = {
  inquiryId: string;
  token: string;
  selfReportedSource: string;
};

export class ReportInquirySourceUseCase {
  constructor(
    private readonly inquiryRepository: IInquiryRepository,
    private readonly sourceTokenSecret: string
  ) {}

  async execute(
    input: ReportInquirySourceCommand,
    now = Date.now()
  ): Promise<Result<{ selfReportedSource: string }>> {
    const inquiryId = input.inquiryId?.trim() ?? '';
    const token = input.token?.trim() ?? '';
    const source = input.selfReportedSource?.trim() ?? '';
    if (!inquiryId || !token) {
      return Result.failure(ErrorCatalog.INQUIRY_SOURCE_TOKEN_INVALID);
    }
    if (!isSelfReportedSource(source)) {
      return Result.failure(ErrorCatalog.INQUIRY_INVALID_INPUT);
    }
    if (!inquirySourceTokenMatches(inquiryId, token, this.sourceTokenSecret)) {
      return Result.failure(ErrorCatalog.INQUIRY_SOURCE_TOKEN_INVALID);
    }

    try {
      const inquiry = await this.inquiryRepository.findById(inquiryId);
      if (!inquiry || !inquirySourceWindowOpen(inquiry.createdAt, now)) {
        return Result.failure(ErrorCatalog.INQUIRY_SOURCE_TOKEN_INVALID);
      }
      const saved = await this.inquiryRepository.setSelfReportedSource(inquiryId, source);
      if (!saved) {
        return Result.failure(ErrorCatalog.INQUIRY_SOURCE_TOKEN_INVALID);
      }
      return Result.success({ selfReportedSource: source });
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
