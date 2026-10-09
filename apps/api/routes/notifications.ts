import express, { Router, type RequestHandler } from 'express';
import { NotificationController } from '@api/controllers/NotificationController';
import { Container } from '@api/infrastructure/container';

export type NotificationRouterDeps = {
  requireAuth: RequestHandler[];
};

export function createNotificationRouter(
  container: Container,
  deps: NotificationRouterDeps
): Router {
  const router = express.Router();
  const controller = new NotificationController(container);
  const { requireAuth } = deps;

  router.get('/notifications/unread-count', ...requireAuth, (req, res) =>
    controller.unreadCount(req, res)
  );
  router.get('/notifications', ...requireAuth, (req, res) => controller.list(req, res));
  router.patch('/notifications/:id', ...requireAuth, (req, res) => controller.update(req, res));
  router.get('/notification-preferences', ...requireAuth, (req, res) =>
    controller.listPreferences(req, res)
  );
  router.put('/notification-preferences', ...requireAuth, (req, res) =>
    controller.putPreference(req, res)
  );

  return router;
}
