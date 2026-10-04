import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

/** Set by requireAuth / createProtectedMiddlewareStack. */
export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

/** Set by optionalAuth when a valid bearer token is present. */
export interface RequestWithOptionalUser extends Request {
  user?: AuthenticatedUser;
}
