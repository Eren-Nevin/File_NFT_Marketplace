import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Address } from 'viem';
import type { SessionRole } from '@nftm/shared/roles';
import { ApiError, ERROR_CODES } from '@nftm/shared/errors';
import { sessionCookieName, verifySession, type SessionClaims } from './session.js';

type AppKind = 'dapp' | 'admin';

declare module 'hono' {
  interface ContextVariableMap {
    session?: SessionClaims;
    appKind?: AppKind;
  }
}

function detectAppKind(c: Context): AppKind {
  const origin = c.req.header('origin') ?? c.req.header('referer') ?? '';
  if (origin.includes('admin')) return 'admin';
  return 'dapp';
}

export const sessionLoader: MiddlewareHandler = async (c, next) => {
  const kind = detectAppKind(c);
  c.set('appKind', kind);
  const token = getCookie(c, sessionCookieName(kind));
  if (token) {
    const claims = await verifySession(token);
    if (claims) c.set('session', claims);
  }
  await next();
};

export function requireSession(): MiddlewareHandler {
  return async (c, next) => {
    const session = c.get('session');
    if (!session) {
      throw new ApiError(ERROR_CODES.UNAUTHENTICATED, 'sign in to continue', 401);
    }
    await next();
  };
}

export function requireRole(...roles: SessionRole[]): MiddlewareHandler {
  const allowed = new Set(roles);
  return async (c, next) => {
    const session = c.get('session');
    if (!session) {
      throw new ApiError(ERROR_CODES.UNAUTHENTICATED, 'sign in to continue', 401);
    }
    if (!allowed.has(session.role)) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'insufficient role', 403);
    }
    await next();
  };
}

export function sessionAddress(c: Context): Address {
  const session = c.get('session');
  if (!session) {
    throw new ApiError(ERROR_CODES.UNAUTHENTICATED, 'sign in to continue', 401);
  }
  return session.sub as Address;
}
