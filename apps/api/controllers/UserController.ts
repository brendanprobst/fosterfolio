import { Request, Response } from 'express';
import type { UpdateUserInput } from '@api/application/use-cases/UpdateUserUseCase';
import type { RequestWithOptionalUser, RequestWithUser } from '@api/auth/types';
import type { SocialLink } from '@api/domain/entities/User';
import { Container } from '@api/infrastructure/container';
import { ResponseHandler } from '@api/utils/responseHandler';

function isSocialLinks(value: unknown): value is SocialLink[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof (item as SocialLink).label === 'string' &&
      typeof (item as SocialLink).url === 'string'
  );
}

export class UserController {
  constructor(private readonly container: Container) {}

  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id ?? '');
      if (!id) {
        res.status(400).json({
          error: { status: 400, message: 'id is required' },
        });
        return;
      }
      const result = await this.container.getGetUserUseCase().execute(id);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
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
      if (body.socialLinks !== undefined && !isSocialLinks(body.socialLinks) && body.socialLinks !== null) {
        res.status(400).json({
          error: {
            status: 400,
            message: 'socialLinks must be an array of { label, url }',
          },
        });
        return;
      }

      const input: UpdateUserInput = {};
      if ('displayName' in body) input.displayName = body.displayName;
      if ('avatarUrl' in body) input.avatarUrl = body.avatarUrl;
      if ('bio' in body) input.bio = body.bio;
      if ('zipCode' in body) input.zipCode = body.zipCode;
      if ('socialLinks' in body) input.socialLinks = body.socialLinks;
      if ('sheltersText' in body) input.sheltersText = body.sheltersText;

      const result = await this.container
        .getUpdateUserUseCase()
        .execute(actorId, id, input);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async listPets(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id ?? '');
      if (!id) {
        res.status(400).json({
          error: { status: 400, message: 'id is required' },
        });
        return;
      }
      const result = await this.container.getListPetsByOwnerUseCase().execute(id);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async listPosts(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id ?? '');
      if (!id) {
        res.status(400).json({
          error: { status: 400, message: 'id is required' },
        });
        return;
      }
      const result = await this.container
        .getListPostsByAuthorUseCase()
        .execute(id);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async addStar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id ?? '');
      if (!id) {
        res.status(400).json({
          error: { status: 400, message: 'id is required' },
        });
        return;
      }
      const sessionToken = String(req.body?.session_token ?? req.body?.sessionToken ?? '');
      const starrerUserId = (req as RequestWithOptionalUser).user?.id ?? null;
      const result = await this.container.getAddStarUseCase().execute({
        starredUserId: id,
        sessionToken,
        starrerUserId,
      });
      if (result.isFailure()) {
        ResponseHandler.handleResult(result, res);
        return;
      }
      const value = result.getValue();
      res.status(value.created ? 201 : 200).json(value);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async getStarCount(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id ?? '');
      if (!id) {
        res.status(400).json({
          error: { status: 400, message: 'id is required' },
        });
        return;
      }
      const result = await this.container.getGetStarCountUseCase().execute(id);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }
}
