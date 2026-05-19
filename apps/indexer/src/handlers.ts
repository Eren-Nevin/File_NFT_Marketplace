import { eq, sql } from 'drizzle-orm';
import {
  collections,
  lazyVouchers,
  listings,
  sales,
} from '@nftm/db/schema';
import type { getDb } from '@nftm/db';

type Db = ReturnType<typeof getDb>;

export async function handleCollectionCreated(
  db: Db,
  chainId: number,
  ev: {
    address: `0x${string}`;
    txHash: `0x${string}`;
    blockNumber: bigint;
    name: string;
    symbol: string;
    royaltyReceiver: `0x${string}`;
    royaltyBps: number;
    platformFeeBps: number;
    deployer: `0x${string}`;
    salt: `0x${string}`;
  },
) {
  await db
    .insert(collections)
    .values({
      chainId,
      contractAddress: ev.address.toLowerCase(),
      name: ev.name,
      symbol: ev.symbol,
      royaltyBps: ev.royaltyBps,
      royaltyReceiver: ev.royaltyReceiver.toLowerCase(),
      platformFeeBps: ev.platformFeeBps,
      deployer: ev.deployer.toLowerCase(),
      txHash: ev.txHash,
      blockNumber: ev.blockNumber,
      salt: ev.salt,
    })
    .onConflictDoNothing();
}

export async function handlePrimarySale(
  db: Db,
  chainId: number,
  ev: {
    voucherHash: `0x${string}`;
    collection: `0x${string}`;
    tokenId: bigint;
    buyer: `0x${string}`;
    amount: bigint;
    totalPaid: bigint;
    txHash: `0x${string}`;
    logIndex: number;
    blockNumber: bigint;
  },
) {
  await db
    .insert(sales)
    .values({
      chainId,
      txHash: ev.txHash,
      logIndex: ev.logIndex,
      blockNumber: ev.blockNumber,
      kind: 'primary',
      buyer: ev.buyer.toLowerCase(),
      collectionAddress: ev.collection.toLowerCase(),
      tokenId: ev.tokenId.toString(),
      amount: ev.amount,
      pricePaid: ev.totalPaid,
    })
    .onConflictDoNothing();

  // Bump sold_amount on the matching voucher row.
  await db
    .update(lazyVouchers)
    .set({
      soldAmount: sql`${lazyVouchers.soldAmount} + ${ev.amount}`,
      status: sql`CASE WHEN ${lazyVouchers.soldAmount} + ${ev.amount} >= ${lazyVouchers.maxAmount}
                   THEN 'exhausted'::voucher_status ELSE ${lazyVouchers.status} END`,
    })
    .where(eq(lazyVouchers.voucherHash, ev.voucherHash));
}

export async function handleListed(
  db: Db,
  chainId: number,
  ev: {
    listingId: `0x${string}`;
    seller: `0x${string}`;
    collection: `0x${string}`;
    tokenId: bigint;
    amount: bigint;
    pricePerUnit: bigint;
    txHash: `0x${string}`;
  },
) {
  await db
    .insert(listings)
    .values({
      id: ev.listingId,
      seller: ev.seller.toLowerCase(),
      collectionAddress: ev.collection.toLowerCase(),
      tokenId: ev.tokenId.toString(),
      amountInitial: ev.amount,
      amountRemaining: ev.amount,
      pricePerUnit: ev.pricePerUnit,
      status: 'active',
      txHashCreated: ev.txHash,
    })
    .onConflictDoNothing();
}

export async function handleCancelled(db: Db, ev: { listingId: `0x${string}` }) {
  await db
    .update(listings)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(listings.id, ev.listingId));
}

export async function handleSecondarySale(
  db: Db,
  chainId: number,
  ev: {
    listingId: `0x${string}`;
    buyer: `0x${string}`;
    seller: `0x${string}`;
    collection: `0x${string}`;
    tokenId: bigint;
    amount: bigint;
    totalPaid: bigint;
    royaltyAmount: bigint;
    platformFee: bigint;
    txHash: `0x${string}`;
    logIndex: number;
    blockNumber: bigint;
  },
) {
  await db
    .insert(sales)
    .values({
      chainId,
      txHash: ev.txHash,
      logIndex: ev.logIndex,
      blockNumber: ev.blockNumber,
      kind: 'secondary',
      listingId: ev.listingId,
      buyer: ev.buyer.toLowerCase(),
      seller: ev.seller.toLowerCase(),
      collectionAddress: ev.collection.toLowerCase(),
      tokenId: ev.tokenId.toString(),
      amount: ev.amount,
      pricePaid: ev.totalPaid,
      royaltyAmount: ev.royaltyAmount,
      platformFeeAmount: ev.platformFee,
    })
    .onConflictDoNothing();

  await db
    .update(listings)
    .set({
      amountRemaining: sql`GREATEST(${listings.amountRemaining} - ${ev.amount}, 0)`,
      status: sql`CASE WHEN ${listings.amountRemaining} - ${ev.amount} <= 0
                   THEN 'sold'::listing_status ELSE ${listings.status} END`,
      updatedAt: new Date(),
    })
    .where(eq(listings.id, ev.listingId));
}
