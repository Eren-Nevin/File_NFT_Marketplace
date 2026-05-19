import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { eq } from 'drizzle-orm';
import { zSiweNonceRequest, zSiweVerifyRequest } from '@nftm/shared/schemas';
import { ApiError, ERROR_CODES } from '@nftm/shared/errors';
import type { SessionRole } from '@nftm/shared/roles';
import { admins, users } from '@nftm/db/schema';
import { getDeps } from '../deps.js';
import { issueNonce, verifySiwe } from '../auth/siwe.js';
import {
  issueSession,
  sessionCookieName,
  sessionCookieOptions,
} from '../auth/session.js';
import { sessionLoader } from '../auth/middleware.js';
import { take } from '../lib/rateLimit.js';
import { hashIp } from '../lib/ipHash.js';

const auth = new Hono();

auth.use('*', sessionLoader);

auth.post('/nonce', async (c) => {
  const deps = getDeps();
  const body = zSiweNonceRequest.parse(await c.req.json());

  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const allowed = await take(deps.redis, `nonce:${hashIp(ip)}`, 30, 60);
  if (!allowed) throw new ApiError(ERROR_CODES.RATE_LIMITED, 'slow down', 429);

  const nonce = await issueNonce(deps.redis, body.address);
  return c.json({ nonce });
});

auth.post('/verify', async (c) => {
  const deps = getDeps();
  const kind = c.get('appKind') ?? 'dapp';
  const body = zSiweVerifyRequest.parse(await c.req.json());

  const expectedOrigin = kind === 'admin' ? deps.env.ADMIN_PUBLIC_ORIGIN : deps.env.DAPP_PUBLIC_ORIGIN;
  const expectedDomain = new URL(expectedOrigin).host;

  const verified = await verifySiwe({
    publicClient: deps.publicClient,
    redis: deps.redis,
    message: body.message,
    signature: body.signature,
    expectedDomain,
    expectedChainId: deps.env.CHAIN_ID,
  });
  if ('error' in verified) {
    throw new ApiError(ERROR_CODES.SIWE_INVALID, verified.error, 401);
  }

  const address = verified.address.toLowerCase() as `0x${string}`;

  // Upsert user
  await deps.db
    .insert(users)
    .values({ address })
    .onConflictDoUpdate({
      target: users.address,
      set: { lastSeenAt: new Date() },
    });

  // Determine role
  let role: SessionRole = 'USER';
  const adminRow = await deps.db
    .select()
    .from(admins)
    .where(eq(admins.address, address))
    .limit(1);
  if (adminRow[0]) role = adminRow[0].role;

  // Admin app: require the address to be in the allowlist.
  if (kind === 'admin' && role === 'USER') {
    throw new ApiError(ERROR_CODES.ADMIN_NOT_ALLOWED, 'wallet not on admin allowlist', 403);
  }

  const { token, expiresAt } = await issueSession({ address, role });
  setCookie(c, sessionCookieName(kind), token, sessionCookieOptions(kind));
  return c.json({ address, role, expiresAt });
});

auth.post('/logout', async (c) => {
  const kind = c.get('appKind') ?? 'dapp';
  deleteCookie(c, sessionCookieName(kind), sessionCookieOptions(kind));
  return c.json({ ok: true });
});

auth.get('/me', async (c) => {
  const session = c.get('session');
  if (!session) return c.json({ address: null, role: null });
  return c.json({ address: session.sub, role: session.role, expiresAt: new Date(session.exp * 1000) });
});

export default auth;
