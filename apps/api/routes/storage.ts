import express, { Router, type RequestHandler } from 'express';
import { StorageController } from '@api/controllers/StorageController';
import { Container } from '@api/infrastructure/container';

export type StorageRouterDeps = {
  requireAuth: RequestHandler[];
};

export function createStorageRouter(
  container: Container,
  deps: StorageRouterDeps
): Router {
  const router = express.Router();
  const controller = new StorageController(container);
  const { requireAuth } = deps;

  router.post('/sign', ...requireAuth, (req, res) =>
    controller.signUpload(req, res)
  );

  return router;
}
