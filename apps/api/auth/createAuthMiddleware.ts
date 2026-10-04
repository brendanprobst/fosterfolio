import type { RequestHandler } from 'express';
import { createProtectedMiddlewareStack } from '@api/auth/createProtectedMiddlewareStack';
import { optionalSupabaseAuth } from '@api/auth/supabaseAuthMiddleware';
import type { Container } from '@api/infrastructure/container';

/**
 * Per-route required auth: JWT verification + optional email allowlist.
 * Spread onto a route: `router.post('/', ...requireAuth, handler)`.
 */
export function createRequireAuth(container: Container): RequestHandler[] {
  return createProtectedMiddlewareStack(container);
}

/**
 * Per-route optional auth. Does not run the allowlist (anonymous callers are expected).
 * When a bearer token is present it must be valid.
 */
export function createOptionalAuth(): RequestHandler {
  return optionalSupabaseAuth;
}
