import { Request, Response } from 'express';
import type { CreatePetCommand } from '@api/application/use-cases/CreatePetUseCase';
import type { UpdatePetCommand } from '@api/application/use-cases/UpdatePetUseCase';
import type { RequestWithUser } from '@api/auth/types';
import { Container } from '@api/infrastructure/container';
import { ResponseHandler } from '@api/utils/responseHandler';

function readPetBody(body: Record<string, unknown>): UpdatePetCommand {
  const input: UpdatePetCommand = {};
  if (typeof body.name === 'string') input.name = body.name;
  if (typeof body.species === 'string') input.species = body.species;
  if ('breed' in body) input.breed = body.breed as string | null;
  if ('ageValue' in body) input.ageValue = body.ageValue as number | null;
  if ('ageUnit' in body) input.ageUnit = body.ageUnit as string | null;
  if ('sex' in body) input.sex = body.sex as string | null;
  if ('size' in body) input.size = body.size as string | null;
  if (typeof body.status === 'string') input.status = body.status;
  if ('subStatus' in body) input.subStatus = body.subStatus as string | null;
  if ('shelterLinkName' in body) {
    input.shelterLinkName = body.shelterLinkName as string | null;
  }
  if ('shelterLinkUrl' in body) {
    input.shelterLinkUrl = body.shelterLinkUrl as string | null;
  }
  if ('primaryPhotoUrl' in body) {
    input.primaryPhotoUrl = body.primaryPhotoUrl as string | null;
  }
  if ('photos' in body) {
    input.photos = (body.photos as CreatePetCommand['photos']) ?? null;
  }
  if ('bioMarkdown' in body) input.bioMarkdown = body.bioMarkdown as string | null;
  if ('importantLinks' in body) {
    input.importantLinks =
      (body.importantLinks as CreatePetCommand['importantLinks']) ?? null;
  }
  return input;
}

export class PetController {
  constructor(private readonly container: Container) {}

  async createPet(req: Request, res: Response): Promise<void> {
    try {
      const ownerId = (req as RequestWithUser).user.id;
      const body = req.body ?? {};
      if (typeof body.name !== 'string' || typeof body.species !== 'string') {
        res.status(400).json({
          error: {
            status: 400,
            message: 'name and species are required strings',
          },
        });
        return;
      }
      const partial = readPetBody(body);
      const command: CreatePetCommand = {
        ...partial,
        name: body.name,
        species: body.species,
      };
      const result = await this.container
        .getCreatePetUseCase()
        .execute(ownerId, command);
      if (result.isFailure()) {
        ResponseHandler.handleResult(result, res);
        return;
      }
      res.status(201).json(result.getValue());
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async getPet(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id ?? '');
      if (!id) {
        res.status(400).json({
          error: { status: 400, message: 'id is required' },
        });
        return;
      }
      const result = await this.container.getGetPetUseCase().execute(id);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async updatePet(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id ?? '');
      if (!id) {
        res.status(400).json({
          error: { status: 400, message: 'id is required' },
        });
        return;
      }
      const actorId = (req as RequestWithUser).user.id;
      const input = readPetBody(req.body ?? {});
      const result = await this.container
        .getUpdatePetUseCase()
        .execute(actorId, id, input);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async deletePet(req: Request, res: Response): Promise<void> {
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
        .getSoftDeletePetUseCase()
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

  async listUpdates(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id ?? '');
      if (!id) {
        res.status(400).json({
          error: { status: 400, message: 'id is required' },
        });
        return;
      }
      const result = await this.container.getGetPetUpdatesUseCase().execute(id);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }
}
