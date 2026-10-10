import { Request, Response } from 'express';
import type { CreateInquiryCommand } from '@api/application/use-cases/CreateInquiryUseCase';
import type { ReportInquirySourceCommand } from '@api/application/use-cases/ReportInquirySourceUseCase';
import { Container } from '@api/infrastructure/container';
import { ResponseHandler } from '@api/utils/responseHandler';

export class InquiryController {
  constructor(private readonly container: Container) {}

  async createInquiry(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body ?? {};
      const command: CreateInquiryCommand = {
        targetUserId: String(body.targetUserId ?? ''),
        senderName: String(body.senderName ?? ''),
        senderEmail: String(body.senderEmail ?? ''),
        message: String(body.message ?? ''),
      };
      if ('targetPetId' in body) {
        command.targetPetId = body.targetPetId as string | null;
      }
      if ('zipCode' in body) {
        command.zipCode = body.zipCode as string | null;
      }
      if ('sourceLinkId' in body) {
        command.sourceLinkId = body.sourceLinkId as string | null;
      }
      if ('sourceChannelKey' in body) {
        command.sourceChannelKey = body.sourceChannelKey as string | null;
      }
      if ('viaFosterMe' in body) {
        command.viaFosterMe = body.viaFosterMe as boolean;
      }
      if ('turnstileToken' in body) {
        command.turnstileToken = body.turnstileToken as string | null;
      }

      const result = await this.container
        .getCreateInquiryUseCase()
        .execute(command);
      if (result.isFailure()) {
        ResponseHandler.handleResult(result, res);
        return;
      }
      res.status(201).json(result.getValue());
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async reportSource(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body ?? {};
      const command: ReportInquirySourceCommand = {
        inquiryId: String(req.params.id ?? ''),
        token: String(body.token ?? ''),
        selfReportedSource: String(body.selfReportedSource ?? ''),
      };
      const result = await this.container
        .getReportInquirySourceUseCase()
        .execute(command);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }
}
