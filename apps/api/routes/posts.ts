import express, { Router, type RequestHandler } from 'express';
import { PostController } from '@api/controllers/PostController';
import { Container } from '@api/infrastructure/container';

export type PostRouterDeps = {
  requireAuth: RequestHandler[];
};

export function createPostRouter(
  container: Container,
  deps: PostRouterDeps
): Router {
  const router = express.Router();
  const controller = new PostController(container);
  const { requireAuth } = deps;

  router.get('/', (req, res) => controller.listFeed(req, res));
  router.post('/', ...requireAuth, (req, res) => controller.createPost(req, res));
  router.get('/:id', (req, res) => controller.getPost(req, res));
  router.put('/:id', ...requireAuth, (req, res) => controller.updatePost(req, res));
  router.delete('/:id', ...requireAuth, (req, res) => controller.deletePost(req, res));

  return router;
}
