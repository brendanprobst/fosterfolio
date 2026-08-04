import express, { Router, type RequestHandler } from 'express';
import { PetController } from '@api/controllers/PetController';
import { Container } from '@api/infrastructure/container';

export type PetRouterDeps = {
  requireAuth: RequestHandler[];
};

export function createPetRouter(
  container: Container,
  deps: PetRouterDeps
): Router {
  const router = express.Router();
  const controller = new PetController(container);
  const { requireAuth } = deps;

  router.post('/', ...requireAuth, (req, res) => controller.createPet(req, res));
  router.get('/:id/updates', (req, res) => controller.listUpdates(req, res));
  router.get('/:id', (req, res) => controller.getPet(req, res));
  router.put('/:id', ...requireAuth, (req, res) => controller.updatePet(req, res));
  router.delete('/:id', ...requireAuth, (req, res) => controller.deletePet(req, res));

  return router;
}
