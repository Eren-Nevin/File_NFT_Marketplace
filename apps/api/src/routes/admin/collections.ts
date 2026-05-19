import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { auditLogs, collections } from '@nftm/db/schema';
import { zCreateCollectionRequest, zChainId, zAddress, zTxHash } from '@nftm/shared/schemas';
import { ApiError, ERROR_CODES } from '@nftm/shared/errors';
import { z } from 'zod';
import { getDeps } from '../../deps.js';
import { requireRole, sessionAddress } from '../../auth/middleware.js';

const r = new Hono();
r.use('*', requireRole('ADMIN', 'SUPER_ADMIN'));

/// Prepare a deploy: returns the parameters the admin wallet must send to
/// `CollectionFactory.createCollection`. The admin signs the tx in their wallet;
/// the indexer then observes `CollectionCreated` and writes the canonical row.
/// We pre-stage a draft row here so the dashboard can show the deploy in flight.
r.post('/draft', async (c) => {
  const deps = getDeps();
  const actor = sessionAddress(c);
  const body = zCreateCollectionRequest.parse(await c.req.json());

  await deps.db.insert(auditLogs).values({
    actor,
    action: 'collection.draft',
    targetTable: 'collections',
    after: body,
  });

  // Returns the calldata template — the frontend constructs the tx via viem.
  return c.json({
    factoryAddress: deps.env.FACTORY_ADDRESS ?? null,
    args: {
      name: body.name,
      symbol: body.symbol,
      royaltyReceiver: body.royaltyReceiver,
      royaltyBps: body.royaltyBps,
      platformFeeBps: body.platformFeeBps,
    },
  });
});

/// Called by the dashboard once the deploy tx has been mined. Used as a
/// hint — the indexer also writes this row, but the dashboard wants instant
/// feedback. Idempotent via the (chainId, contractAddress) unique index.
const zConfirmDeploy = z.object({
  chainId: zChainId,
  contractAddress: zAddress,
  name: z.string(),
  symbol: z.string(),
  royaltyReceiver: zAddress,
  royaltyBps: z.number().int(),
  platformFeeBps: z.number().int(),
  txHash: zTxHash,
});

r.post('/confirm', async (c) => {
  const deps = getDeps();
  const actor = sessionAddress(c);
  const body = zConfirmDeploy.parse(await c.req.json());

  const inserted = await deps.db
    .insert(collections)
    .values({
      chainId: body.chainId,
      contractAddress: body.contractAddress.toLowerCase(),
      name: body.name,
      symbol: body.symbol,
      royaltyBps: body.royaltyBps,
      royaltyReceiver: body.royaltyReceiver.toLowerCase(),
      platformFeeBps: body.platformFeeBps,
      deployer: actor,
      txHash: body.txHash,
    })
    .onConflictDoNothing()
    .returning();

  return c.json(inserted[0] ?? { ok: true });
});

r.get('/', async (c) => {
  const { db } = getDeps();
  const rows = await db.select().from(collections);
  return c.json({ items: rows });
});

r.get('/:id', async (c) => {
  const { db } = getDeps();
  const id = c.req.param('id');
  const [row] = await db.select().from(collections).where(eq(collections.id, id)).limit(1);
  if (!row) throw new ApiError(ERROR_CODES.NOT_FOUND, 'collection not found', 404);
  return c.json(row);
});

export default r;
