import { Request, Response } from 'express';
import type { CreateInquiryCommand } from '@api/application/use-cases/CreateInquiryUseCase';
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
}
