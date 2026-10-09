import { Request, Response } from 'express';
import type { RequestWithUser } from '@api/auth/types';
import { Container } from '@api/infrastructure/container';
import { ResponseHandler } from '@api/utils/responseHandler';

function readRange(req: Request): string | undefined {
  const range = req.query.range;
  if (Array.isArray(range)) {
    return typeof range[0] === 'string' ? range[0] : undefined;
  }
  return typeof range === 'string' ? range : undefined;
}

export class PetAnalyticsController {
  constructor(private readonly container: Container) {}

  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const actorId = (req as RequestWithUser).user.id;
      const petId = String(req.params.id ?? '');
      const result = await this.container
        .getGetPetAnalyticsUseCase()
        .execute(actorId, petId, readRange(req));
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const actorId = (req as RequestWithUser).user.id;
      const petId = String(req.params.id ?? '');
      const result = await this.container
        .getGetPetAnalyticsSummaryUseCase()
        .execute(actorId, petId);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }
}
