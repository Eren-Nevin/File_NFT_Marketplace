import { SignJWT, jwtVerify } from 'jose';
import type { Address } from 'viem';
import type { SessionRole } from '@nftm/shared/roles';
import { loadEnv } from '../env.js';

export interface SessionClaims {
  sub: Address; // wallet address (lowercased)
  role: SessionRole;
  iat: number;
  exp: number;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const SESSION_COOKIE_DAPP = 'nftm_s';
const SESSION_COOKIE_ADMIN = 'nftm_sa';

function key() {
  return new TextEncoder().encode(loadEnv().JWT_SECRET);
}

export async function issueSession(claims: { address: Address; role: SessionRole }) {
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.address.toLowerCase())
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_TTL_SECONDS)
    .sign(key());
  return { token, expiresAt: new Date((now + SESSION_TTL_SECONDS) * 1000) };
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    return payload as unknown as SessionClaims;
  } catch {
    return null;
  }
}

export function sessionCookieName(kind: 'dapp' | 'admin'): string {
  return kind === 'admin' ? SESSION_COOKIE_ADMIN : SESSION_COOKIE_DAPP;
}

export function sessionCookieOptions(kind: 'dapp' | 'admin') {
  const env = loadEnv();
  return {
    path: '/',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: kind === 'admin' ? ('strict' as const) : ('lax' as const),
    domain: env.SESSION_COOKIE_DOMAIN || undefined,
    maxAge: SESSION_TTL_SECONDS,
  };
}
