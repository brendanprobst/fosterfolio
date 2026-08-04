import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { createRequireAuth } from '@api/auth/createAuthMiddleware';
import { swaggerSpec } from '@api/config/swagger/index';
import type { Container } from '@api/infrastructure/container';
import indexRouter from '@api/routes/index';
import { createPetRouter } from '@api/routes/pets';
import { createProfileRouter } from '@api/routes/profile';
import { createUserRouter } from '@api/routes/users';

/**
 * Mounts all HTTP routers. Auth is applied per-route inside each router via
 * `createRequireAuth` / `createOptionalAuth`.
 */
export function registerRoutes(app: Express, container: Container): void {
  const requireAuth = createRequireAuth(container);

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
  app.use('/users', createUserRouter(container, { requireAuth }));
  app.use('/pets', createPetRouter(container, { requireAuth }));
}
