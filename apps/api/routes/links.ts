import express, { Router, type RequestHandler } from 'express';
import { TrackedLinkController } from '@api/controllers/TrackedLinkController';
import { Container } from '@api/infrastructure/container';

export type TrackedLinkRouterDeps = {
  requireAuth: RequestHandler[];
};

export function createTrackedLinkRouter(
  container: Container,
  deps: TrackedLinkRouterDeps
): Router {
  const router = express.Router();
  const controller = new TrackedLinkController(container);
  const { requireAuth } = deps;

  router.get('/resolve/:code', (req, res) => controller.resolveLink(req, res));
  router.patch('/:id', ...requireAuth, (req, res) => controller.updateLink(req, res));

  return router;
}

export function createChannelRouter(
  container: Container,
  deps: TrackedLinkRouterDeps
): Router {
  const router = express.Router();
  const controller = new TrackedLinkController(container);
  router.get('/channels', ...deps.requireAuth, (req, res) =>
    controller.listChannels(req, res)
  );
  return router;
}
