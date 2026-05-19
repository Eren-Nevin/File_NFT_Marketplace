import { Hono } from 'hono';
import { desc } from 'drizzle-orm';
import { erc20Abi, type Address } from 'viem';
import { sales } from '@nftm/db/schema';
import { ApiError, ERROR_CODES } from '@nftm/shared/errors';
import { z } from 'zod';
import { getDeps } from '../../deps.js';
import { requireRole } from '../../auth/middleware.js';

const r = new Hono();
r.use('*', requireRole('SUPER_ADMIN'));

const zBalanceQuery = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .transform((v) => v as `0x${string}`),
});

r.get('/balance', async (c) => {
  const deps = getDeps();
  const parsed = zBalanceQuery.safeParse({ address: c.req.query('address') });
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.VALIDATION, 'address required', 400);
  }
  const balance = await deps.publicClient.readContract({
    address: deps.env.USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [parsed.data.address as Address],
  });
  return c.json({ address: parsed.data.address, usdc: balance.toString() });
});

r.get('/sales', async (c) => {
  const { db } = getDeps();
  const rows = await db.select().from(sales).orderBy(desc(sales.occurredAt)).limit(200);
  return c.json({ items: rows });
});

export default r;
