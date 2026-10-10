import { Request, Response } from 'express';
import type { CreateOwnerLinkCommand } from '@api/application/use-cases/CreateOwnerLinkUseCase';
import type { CreateTrackedLinkCommand } from '@api/application/use-cases/CreateTrackedLinkUseCase';
import type { UpdateTrackedLinkCommand } from '@api/application/use-cases/UpdateTrackedLinkUseCase';
import type { RequestWithUser } from '@api/auth/types';
import { Container } from '@api/infrastructure/container';
import { ResponseHandler } from '@api/utils/responseHandler';

function readChannelBody(body: Record<string, unknown>): {
  channelKey?: string | null;
  channelName?: string | null;
} {
  const input: { channelKey?: string | null; channelName?: string | null } = {};
  if ('channelKey' in body) {
    input.channelKey = body.channelKey as string | null;
  }
  if ('channelName' in body) {
    input.channelName = body.channelName as string | null;
  }
  return input;
}

export class TrackedLinkController {
  constructor(private readonly container: Container) {}

  async createLink(req: Request, res: Response): Promise<void> {
    try {
      const actorId = (req as RequestWithUser).user.id;
      const petId = String(req.params.id ?? '');
      const body = (req.body ?? {}) as Record<string, unknown>;
      const command: CreateTrackedLinkCommand = {
        ...readChannelBody(body),
      };
      if ('label' in body) {
        command.label = body.label as string | null;
      }
      const result = await this.container
        .getCreateTrackedLinkUseCase()
        .execute(actorId, petId, command);
      if (result.isFailure()) {
        ResponseHandler.handleResult(result, res);
        return;
      }
      res.status(201).json(result.getValue());
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async listLinks(req: Request, res: Response): Promise<void> {
    try {
      const actorId = (req as RequestWithUser).user.id;
      const petId = String(req.params.id ?? '');
      const result = await this.container
        .getListTrackedLinksUseCase()
        .execute(actorId, petId);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async updateLink(req: Request, res: Response): Promise<void> {
    try {
      const actorId = (req as RequestWithUser).user.id;
      const linkId = String(req.params.id ?? '');
      const body = (req.body ?? {}) as Record<string, unknown>;
      const command: UpdateTrackedLinkCommand = {
        ...readChannelBody(body),
      };
      if ('label' in body) {
        command.label = body.label as string | null;
      }
      if ('archived' in body) {
        command.archived = body.archived as boolean;
      }
      if ('target' in body) {
        command.target = body.target;
      }
      const result = await this.container
        .getUpdateTrackedLinkUseCase()
        .execute(actorId, linkId, command);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async resolveLink(req: Request, res: Response): Promise<void> {
    try {
      const code = String(req.params.code ?? '');
      const result = await this.container.getResolveTrackedLinkUseCase().execute(code);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async createOwnerLink(req: Request, res: Response): Promise<void> {
    try {
      const actorId = (req as RequestWithUser).user.id;
      const body = (req.body ?? {}) as Record<string, unknown>;
      const command: CreateOwnerLinkCommand = {
        ...readChannelBody(body),
      };
      if ('label' in body) {
        command.label = body.label as string | null;
      }
      if ('isDefault' in body) {
        command.isDefault = body.isDefault as boolean;
      }
      const result = await this.container.getCreateOwnerLinkUseCase().execute(actorId, command);
      if (result.isFailure()) {
        ResponseHandler.handleResult(result, res);
        return;
      }
      res.status(201).json(result.getValue());
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async listOwnerLinks(req: Request, res: Response): Promise<void> {
    try {
      const actorId = (req as RequestWithUser).user.id;
      const result = await this.container.getListOwnerLinksUseCase().execute(actorId);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async listChannels(req: Request, res: Response): Promise<void> {
    try {
      const actorId = (req as RequestWithUser).user.id;
      const result = await this.container.getListChannelsUseCase().execute(actorId);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }
}
