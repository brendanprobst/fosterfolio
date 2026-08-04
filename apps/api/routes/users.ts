import express, { Router, type RequestHandler } from 'express';
import { UserController } from '@api/controllers/UserController';
import { Container } from '@api/infrastructure/container';

export type UserRouterDeps = {
  requireAuth: RequestHandler[];
};

export function createUserRouter(
  container: Container,
  deps: UserRouterDeps
): Router {
  const router = express.Router({ mergeParams: true });
  const controller = new UserController(container);
  const { requireAuth } = deps;

  router.get('/:id/pets', (req, res) => controller.listPets(req, res));
  router.get('/:id', (req, res) => controller.getUser(req, res));
  router.put('/:id', ...requireAuth, (req, res) => controller.updateUser(req, res));

  return router;
}
