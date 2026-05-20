import { Hono } from 'hono';
import { and, desc, eq, sql } from 'drizzle-orm';
import { collections, mediaAssets, nfts, sales } from '@nftm/db/schema';
import { getDeps } from '../deps.js';
import { sessionLoader, requireSession } from '../auth/middleware.js';

const me = new Hono();
me.use('*', sessionLoader, requireSession());

/// Per-NFT purchase history for the signed-in address. Sums bought minus sold
/// across primary + secondary sales recorded by the indexer. Items with a net
/// balance of 0 (user fully resold) are excluded.
me.get('/owned', async (c) => {
  const { db } = getDeps();
  const session = c.get('session')!;
  const meAddr = session.sub.toLowerCase();

  const buys = db
    .select({
      collectionAddress: sales.collectionAddress,
      tokenId: sales.tokenId,
      bought: sql<string>`COALESCE(SUM(${sales.amount}), 0)`.as('bought'),
      lastPurchase: sql<Date>`MAX(${sales.occurredAt})`.as('last_purchase'),
    })
    .from(sales)
    .where(eq(sales.buyer, meAddr))
    .groupBy(sales.collectionAddress, sales.tokenId)
    .as('buys');

  const sells = db
    .select({
      collectionAddress: sales.collectionAddress,
      tokenId: sales.tokenId,
      sold: sql<string>`COALESCE(SUM(${sales.amount}), 0)`.as('sold'),
    })
    .from(sales)
    .where(eq(sales.seller, meAddr))
    .groupBy(sales.collectionAddress, sales.tokenId)
    .as('sells');

  const rows = await db
    .select({
      nft: nfts,
      collection: collections,
      media: mediaAssets,
      bought: buys.bought,
      sold: sql<string | null>`${sells.sold}`,
      lastPurchase: buys.lastPurchase,
    })
    .from(buys)
    .innerJoin(collections, eq(collections.contractAddress, buys.collectionAddress))
    .innerJoin(nfts, and(eq(nfts.collectionId, collections.id), eq(nfts.tokenId, buys.tokenId)))
    .innerJoin(mediaAssets, eq(mediaAssets.id, nfts.mediaAssetId))
    .leftJoin(
      sells,
      and(eq(sells.collectionAddress, buys.collectionAddress), eq(sells.tokenId, buys.tokenId)),
    )
    .orderBy(desc(buys.lastPurchase));

  const items = rows
    .map((r) => {
      const boughtN = BigInt(r.bought ?? '0');
      const soldN = BigInt(r.sold ?? '0');
      const balance = boughtN > soldN ? boughtN - soldN : 0n;
      return {
        nft: r.nft,
        collection: r.collection,
        media: r.media,
        bought: boughtN.toString(),
        sold: soldN.toString(),
        balance: balance.toString(),
        lastPurchase: r.lastPurchase instanceof Date ? r.lastPurchase.toISOString() : r.lastPurchase,
      };
    })
    .filter((r) => BigInt(r.balance) > 0n);

  return c.json({ items });
});

export default me;
