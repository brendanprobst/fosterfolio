import express, { Router, type RequestHandler } from 'express';
import { PetController } from '@api/controllers/PetController';
import { TrackedLinkController } from '@api/controllers/TrackedLinkController';
import { Container } from '@api/infrastructure/container';

export type PetRouterDeps = {
  requireAuth: RequestHandler[];
};

/** Pet ids are uuids. A bare word like `links` must not bind to `/:id`. */
const PET_ID =
  ':id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})';

export function createPetRouter(
  container: Container,
  deps: PetRouterDeps
): Router {
  const router = express.Router();
  const controller = new PetController(container);
  const links = new TrackedLinkController(container);
  const { requireAuth } = deps;

  router.post('/', ...requireAuth, (req, res) => controller.createPet(req, res));
  router.post(`/${PET_ID}/links`, ...requireAuth, (req, res) => links.createLink(req, res));
  router.get(`/${PET_ID}/links`, ...requireAuth, (req, res) => links.listLinks(req, res));
  router.get(`/${PET_ID}/updates`, (req, res) => controller.listUpdates(req, res));
  router.get(`/${PET_ID}`, (req, res) => controller.getPet(req, res));
  router.put(`/${PET_ID}`, ...requireAuth, (req, res) => controller.updatePet(req, res));
  router.delete(`/${PET_ID}`, ...requireAuth, (req, res) => controller.deletePet(req, res));

  return router;
}
