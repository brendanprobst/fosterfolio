import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import {
  createOptionalAuth,
  createRequireAuth,
} from '@api/auth/createAuthMiddleware';
import { swaggerSpec } from '@api/config/swagger/index';
import type { Container } from '@api/infrastructure/container';
import indexRouter from '@api/routes/index';
import { createInquiryRouter } from '@api/routes/inquiries';
import { createPetRouter } from '@api/routes/pets';
import { createPostRouter } from '@api/routes/posts';
import { createProfileRouter } from '@api/routes/profile';
import { createSearchRouter } from '@api/routes/search';
import { createStorageRouter } from '@api/routes/storage';
import { createUserRouter } from '@api/routes/users';

/**
 * Mounts all HTTP routers. Auth is applied per-route inside each router via
 * `createRequireAuth` / `createOptionalAuth`.
 */
export function registerRoutes(app: Express, container: Container): void {
  const requireAuth = createRequireAuth(container);
  const optionalAuth = createOptionalAuth();

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Fosterfolio API · Documentation',
    })
  );

  app.use('/', indexRouter);
  app.use('/profile', createProfileRouter(container, { requireAuth }));
  app.use('/me', createProfileRouter(container, { requireAuth }));
  app.use('/users', createUserRouter(container, { requireAuth, optionalAuth }));
  app.use('/pets', createPetRouter(container, { requireAuth }));
  app.use('/posts', createPostRouter(container, { requireAuth }));
  app.use('/inquiries', createInquiryRouter(container));
  app.use('/search', createSearchRouter(container));
  app.use('/storage', createStorageRouter(container, { requireAuth }));
}

