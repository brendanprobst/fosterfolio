import express, { Router, type RequestHandler } from 'express';
import { Container } from '@api/infrastructure/container';
import { RequestWithUser } from '@api/auth/types';

export type ProfileRouterDeps = {
  requireAuth: RequestHandler[];
};

export function createProfileRouter(
  _container: Container,
  deps: ProfileRouterDeps
): Router {
  const router = express.Router();
  const { requireAuth } = deps;

  router.get('/', ...requireAuth, (req, res) => {
    const authReq = req as RequestWithUser;
    res.json({
      id: authReq.user.id,
      email: authReq.user.email,
    });
  });

  return router;
}
