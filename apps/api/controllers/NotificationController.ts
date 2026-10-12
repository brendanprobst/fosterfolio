import { Request, Response } from 'express';
import type { RequestWithUser } from '@api/auth/types';
import { Container } from '@api/infrastructure/container';
import { ResponseHandler } from '@api/utils/responseHandler';

function queryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' ? value : undefined;
}

export class NotificationController {
  constructor(private readonly container: Container) {}

  async list(req: Request, res: Response): Promise<void> {
    try {
      const actorId = (req as RequestWithUser).user.id;
      const result = await this.container.getListNotificationsUseCase().execute(
        actorId,
        queryValue(req.query.status),
        queryValue(req.query.limit),
        queryValue(req.query.cursor),
        queryValue(req.query.petId)
      );
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async unreadCount(req: Request, res: Response): Promise<void> {
    try {
      const actorId = (req as RequestWithUser).user.id;
      const result = await this.container.getUnreadNotificationCountUseCase().execute(actorId);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const actorId = (req as RequestWithUser).user.id;
      const body = (req.body ?? {}) as { read?: unknown; archived?: unknown };
      const result = await this.container.getUpdateNotificationUseCase().execute(
        actorId,
        String(req.params.id ?? ''),
        {
          ...(typeof body.read === 'boolean' ? { read: body.read } : {}),
          ...(typeof body.archived === 'boolean' ? { archived: body.archived } : {}),
        }
      );
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async listPreferences(req: Request, res: Response): Promise<void> {
    try {
      const actorId = (req as RequestWithUser).user.id;
      const result = await this.container.getNotificationPreferencesUseCase().execute(actorId);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async putPreference(req: Request, res: Response): Promise<void> {
    try {
      const actorId = (req as RequestWithUser).user.id;
      const body = (req.body ?? {}) as { type?: unknown; emailEnabled?: unknown };
      const result = await this.container.getPutNotificationPreferenceUseCase().execute(
        actorId,
        String(body.type ?? ''),
        body.emailEnabled as boolean
      );
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }
}
