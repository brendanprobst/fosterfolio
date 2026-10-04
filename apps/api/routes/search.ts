import express, { Router } from 'express';
import { SearchController } from '@api/controllers/SearchController';
import { Container } from '@api/infrastructure/container';

export function createSearchRouter(container: Container): Router {
  const router = express.Router();
  const controller = new SearchController(container);
  router.get('/', (req, res) => controller.search(req, res));
  return router;
}
