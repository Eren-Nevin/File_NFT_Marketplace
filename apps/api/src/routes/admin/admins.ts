import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { admins, auditLogs, users } from '@nftm/db/schema';
import { zAddress, zAddAdminRequest } from '@nftm/shared/schemas';
import { ApiError, ERROR_CODES } from '@nftm/shared/errors';
import { getDeps } from '../../deps.js';
import { requireRole, sessionAddress } from '../../auth/middleware.js';

const r = new Hono();
r.use('*', requireRole('SUPER_ADMIN'));

r.get('/', async (c) => {
  const { db } = getDeps();
  const rows = await db.select().from(admins);
  return c.json({ items: rows });
});

r.post('/', async (c) => {
  const { db } = getDeps();
  const actor = sessionAddress(c);
  const body = zAddAdminRequest.parse(await c.req.json());
  const address = body.address.toLowerCase() as `0x${string}`;

  await db.insert(users).values({ address }).onConflictDoNothing({ target: users.address });
  const inserted = await db
    .insert(admins)
    .values({ address, role: body.role, addedBy: actor })
    .onConflictDoUpdate({ target: admins.address, set: { role: body.role } })
    .returning();
  await db.insert(auditLogs).values({
    actor,
    action: 'admin.upsert',
    targetTable: 'admins',
    targetId: address,
    after: { role: body.role },
  });
  return c.json(inserted[0]);
});

r.delete('/:address', async (c) => {
  const { db } = getDeps();
  const actor = sessionAddress(c);
  const address = zAddress.parse(c.req.param('address')).toLowerCase() as `0x${string}`;
  if (address === actor) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, 'cannot remove yourself', 403);
  }
  const existing = await db.select().from(admins).where(eq(admins.address, address)).limit(1);
  if (!existing[0]) throw new ApiError(ERROR_CODES.NOT_FOUND, 'admin not found', 404);
  await db.delete(admins).where(eq(admins.address, address));
  await db.insert(auditLogs).values({
    actor,
    action: 'admin.delete',
    targetTable: 'admins',
    targetId: address,
    before: { role: existing[0].role },
  });
  return c.json({ ok: true });
});

export default r;
