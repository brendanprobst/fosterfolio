import { Request, Response } from 'express';
import type { CreatePostCommand } from '@api/application/use-cases/CreatePostUseCase';
import type { UpdatePostCommand } from '@api/application/use-cases/UpdatePostUseCase';
import type { RequestWithUser } from '@api/auth/types';
import { Container } from '@api/infrastructure/container';
import { ResponseHandler } from '@api/utils/responseHandler';

export class PostController {
  constructor(private readonly container: Container) {}

  async createPost(req: Request, res: Response): Promise<void> {
    try {
      const authorId = (req as RequestWithUser).user.id;
      const body = req.body ?? {};
      const command: CreatePostCommand = {};
      if (typeof body.postType === 'string') command.postType = body.postType;
      if ('petId' in body) command.petId = body.petId as string | null;
      if ('bodyText' in body) command.bodyText = body.bodyText as string | null;
      if ('imageUrl' in body) command.imageUrl = body.imageUrl as string | null;
      if (typeof body.geoLock === 'string') command.geoLock = body.geoLock;

      const result = await this.container
        .getCreatePostUseCase()
        .execute(authorId, command);
      if (result.isFailure()) {
        ResponseHandler.handleResult(result, res);
        return;
      }
      res.status(201).json(result.getValue());
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async listFeed(req: Request, res: Response): Promise<void> {
    try {
      const limitRaw = req.query.limit;
      const parsedLimit =
        typeof limitRaw === 'string' ? Number.parseInt(limitRaw, 10) : NaN;
      const cursor =
        typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
      const result = await this.container.getListFeedUseCase().execute({
        ...(Number.isFinite(parsedLimit) ? { limit: parsedLimit } : {}),
        ...(cursor ? { cursor } : {}),
      });
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async getPost(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id ?? '');
      if (!id) {
        res.status(400).json({
          error: { status: 400, message: 'id is required' },
        });
        return;
      }
      const result = await this.container.getGetPostUseCase().execute(id);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async updatePost(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id ?? '');
      if (!id) {
        res.status(400).json({
          error: { status: 400, message: 'id is required' },
        });
        return;
      }
      const actorId = (req as RequestWithUser).user.id;
      const body = req.body ?? {};
      const command: UpdatePostCommand = {};
      if ('bodyText' in body) command.bodyText = body.bodyText as string | null;
      if ('imageUrl' in body) command.imageUrl = body.imageUrl as string | null;
      if (typeof body.geoLock === 'string') command.geoLock = body.geoLock;

      const result = await this.container
        .getUpdatePostUseCase()
        .execute(actorId, id, command);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async deletePost(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id ?? '');
      if (!id) {
        res.status(400).json({
          error: { status: 400, message: 'id is required' },
        });
        return;
      }
      const actorId = (req as RequestWithUser).user.id;
      const result = await this.container
        .getSoftDeletePostUseCase()
        .execute(actorId, id);
      if (result.isFailure()) {
        ResponseHandler.handleResult(result, res);
        return;
      }
      res.status(204).send();
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }
}
