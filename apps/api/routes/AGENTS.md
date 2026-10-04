# `apps/api/routes/` — Express routers

## Purpose

Wire paths to controller methods. Import Swagger **decorator side-effect** files so JSDoc is picked up by `swagger-jsdoc`.

## Pattern

- Export `create*Router(container: Container, deps): Router`.
- Pass `requireAuth` / `optionalAuth` from `createRequireAuth` / `createOptionalAuth` and attach **per route** (not at the Express prefix) so public reads and authenticated writes can share a path.
- Register routers via `routes/registerRoutes.ts`.
