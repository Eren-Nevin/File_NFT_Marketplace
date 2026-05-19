import { Hono } from 'hono';
import { and, desc, eq, sql } from 'drizzle-orm';
import { collections, lazyVouchers, mediaAssets, nfts, nftViewStats, nftViews } from '@nftm/db/schema';
import { ApiError, ERROR_CODES } from '@nftm/shared/errors';
import { getDeps } from '../deps.js';
import { sessionLoader } from '../auth/middleware.js';
import { take } from '../lib/rateLimit.js';
import { hashIp } from '../lib/ipHash.js';

const catalog = new Hono();
catalog.use('*', sessionLoader);

catalog.get('/collections', async (c) => {
  const { db } = getDeps();
  const rows = await db.select().from(collections).orderBy(desc(collections.createdAt)).limit(100);
  return c.json({ items: rows });
});

catalog.get('/collections/:id', async (c) => {
  const { db } = getDeps();
  const id = c.req.param('id');
  const row = await db.select().from(collections).where(eq(collections.id, id)).limit(1);
  if (!row[0]) throw new ApiError(ERROR_CODES.NOT_FOUND, 'collection not found', 404);
  return c.json(row[0]);
});

catalog.get('/nfts', async (c) => {
  const { db } = getDeps();
  const collectionId = c.req.query('collection_id');
  const rows = await db
    .select({
      nft: nfts,
      collection: collections,
      media: mediaAssets,
    })
    .from(nfts)
    .innerJoin(collections, eq(collections.id, nfts.collectionId))
    .innerJoin(mediaAssets, eq(mediaAssets.id, nfts.mediaAssetId))
    .where(collectionId ? eq(nfts.collectionId, collectionId) : undefined)
    .orderBy(desc(nfts.createdAt))
    .limit(100);
  return c.json({ items: rows });
});

catalog.get('/nfts/:id', async (c) => {
  const { db } = getDeps();
  const id = c.req.param('id');
  const row = await db
    .select({
      nft: nfts,
      collection: collections,
      media: mediaAssets,
    })
    .from(nfts)
    .innerJoin(collections, eq(collections.id, nfts.collectionId))
    .innerJoin(mediaAssets, eq(mediaAssets.id, nfts.mediaAssetId))
    .where(eq(nfts.id, id))
    .limit(1);
  if (!row[0]) throw new ApiError(ERROR_CODES.NOT_FOUND, 'nft not found', 404);

  // Active voucher (if any)
  const voucherRow = await db
    .select()
    .from(lazyVouchers)
    .where(and(eq(lazyVouchers.nftId, id), eq(lazyVouchers.status, 'active')))
    .orderBy(desc(lazyVouchers.createdAt))
    .limit(1);

  return c.json({ ...row[0], voucher: voucherRow[0] ?? null });
});

catalog.post('/nfts/:id/view', async (c) => {
  const deps = getDeps();
  const id = c.req.param('id');

  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipHash = hashIp(ip);
  // 1 view per (nft, ip) per minute
  const allowed = await take(deps.redis, `view:${id}:${ipHash}`, 1, 60);
  if (!allowed) return c.json({ counted: false });

  const session = c.get('session');
  const day = new Date().toISOString().slice(0, 10);

  await deps.db.insert(nftViews).values({
    nftId: id,
    viewerAddress: session?.sub ?? null,
    viewerIpHash: ipHash,
  });
  await deps.db
    .insert(nftViewStats)
    .values({ nftId: id, day, viewCount: 1 })
    .onConflictDoUpdate({
      target: [nftViewStats.nftId, nftViewStats.day],
      set: { viewCount: sql`${nftViewStats.viewCount} + 1` },
    });
  return c.json({ counted: true });
});

export default catalog;
