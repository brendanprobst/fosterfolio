import { Request, Response } from 'express';
import type { RequestWithUser } from '@api/auth/types';
import { Container } from '@api/infrastructure/container';
import { ResponseHandler } from '@api/utils/responseHandler';

export class StorageController {
  constructor(private readonly container: Container) {}

  async signUpload(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as RequestWithUser).user.id;
      const filename =
        typeof req.query.filename === 'string'
          ? req.query.filename
          : typeof req.body?.filename === 'string'
            ? req.body.filename
            : '';
      const contentType =
        typeof req.query.contentType === 'string'
          ? req.query.contentType
          : typeof req.body?.contentType === 'string'
            ? req.body.contentType
            : '';
      const contentLengthRaw =
        typeof req.query.contentLength === 'string'
          ? req.query.contentLength
          : typeof req.body?.contentLength === 'number'
            ? String(req.body.contentLength)
            : undefined;
      const contentLength =
        contentLengthRaw !== undefined
          ? Number.parseInt(contentLengthRaw, 10)
          : undefined;

      const result = await this.container.getSignUploadUseCase().execute({
        userId,
        filename,
        contentType,
        ...(contentLength !== undefined && Number.isFinite(contentLength)
          ? { contentLength }
          : {}),
      });
      if (result.isFailure()) {
        ResponseHandler.handleResult(result, res);
        return;
      }
      res.status(200).json(result.getValue());
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }
}
