import { Request, Response } from 'express';
import { Container } from '@api/infrastructure/container';
import { ResponseHandler } from '@api/utils/responseHandler';

export class SearchController {
  constructor(private readonly container: Container) {}

  async search(req: Request, res: Response): Promise<void> {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const result = await this.container.getSearchUseCase().execute(q);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }
}
