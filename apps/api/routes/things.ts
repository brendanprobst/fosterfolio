import express, { Router, type RequestHandler } from 'express';
import { ThingController } from '@api/controllers/ThingController';
import { Container } from '@api/infrastructure/container';
import '@api/config/swagger/decorators/things.decorators';

export type ThingRouterDeps = {
  requireAuth: RequestHandler[];
};

export function createThingRouter(
  container: Container,
  deps: ThingRouterDeps
): Router {
  const router = express.Router();
  const controller = new ThingController(container);
  const { requireAuth } = deps;

  router.get('/', ...requireAuth, (req, res) => controller.listThings(req, res));
  router.post('/', ...requireAuth, (req, res) => controller.createThing(req, res));
  router.get('/:id', ...requireAuth, (req, res) => controller.getThingById(req, res));
  router.put('/:id', ...requireAuth, (req, res) => controller.updateThing(req, res));
  router.delete('/:id', ...requireAuth, (req, res) => controller.deleteThing(req, res));

  return router;
}
