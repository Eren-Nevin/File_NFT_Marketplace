import { Hono } from 'hono';
import { and, desc, eq } from 'drizzle-orm';
import {
  auditLogs,
  collections,
  lazyVouchers,
  nfts,
} from '@nftm/db/schema';
import { zCreateVoucherRequest } from '@nftm/shared/schemas';
import { ApiError, ERROR_CODES } from '@nftm/shared/errors';
import { getDeps } from '../../deps.js';
import { requireRole, sessionAddress } from '../../auth/middleware.js';
import { signLazyVoucher, structHash, voucherSignerAddress } from '../../services/voucher.js';
import { serializeVoucher } from '../../lib/voucherSerialize.js';
import type { LazyVoucher } from '@nftm/shared/eip712';

const r = new Hono();
r.use('*', requireRole('ADMIN', 'SUPER_ADMIN'));

/// List vouchers — newest first, joined with NFT + collection for display.
r.get('/', async (c) => {
  const deps = getDeps();
  const rows = await deps.db
    .select({
      voucher: lazyVouchers,
      nftName: nfts.name,
      collectionName: collections.name,
      collectionSymbol: collections.symbol,
    })
    .from(lazyVouchers)
    .innerJoin(nfts, eq(nfts.id, lazyVouchers.nftId))
    .innerJoin(collections, eq(collections.id, nfts.collectionId))
    .orderBy(desc(lazyVouchers.createdAt))
    .limit(200);
  return c.json({
    items: rows.map((r) => ({
      ...serializeVoucher(r.voucher),
      nftName: r.nftName,
      collectionName: r.collectionName,
      collectionSymbol: r.collectionSymbol,
    })),
  });
});

/// Build and sign an EIP-712 voucher off-chain. The signature is what the
/// buyer submits to the Marketplace contract via `buyVoucher`.
r.post('/', async (c) => {
  const deps = getDeps();
  const actor = sessionAddress(c);
  const body = zCreateVoucherRequest.parse(await c.req.json());

  const [nft] = await deps.db.select().from(nfts).where(eq(nfts.id, body.nftId)).limit(1);
  if (!nft) throw new ApiError(ERROR_CODES.NOT_FOUND, 'nft not found', 404);
  const [collection] = await deps.db
    .select()
    .from(collections)
    .where(eq(collections.id, nft.collectionId))
    .limit(1);
  if (!collection) throw new ApiError(ERROR_CODES.NOT_FOUND, 'collection not found', 404);
  if (collection.archivedAt) {
    throw new ApiError(ERROR_CODES.VALIDATION, 'collection is archived', 400);
  }

  // tokenId: we use the row's stable position within the collection — first
  // voucher allocates tokenId 1, second allocates 2, etc., persisted on the nft
  // row. For idempotency we reuse nft.tokenId if already set.
  let tokenIdStr = nft.tokenId;
  if (!tokenIdStr) {
    const count = await deps.db
      .select({ c: nfts.tokenId })
      .from(nfts)
      .where(and(eq(nfts.collectionId, nft.collectionId)));
    const next = BigInt(count.filter((r) => r.c).length + 1);
    tokenIdStr = next.toString();
    await deps.db.update(nfts).set({ tokenId: tokenIdStr }).where(eq(nfts.id, nft.id));
  }

  const nonceBig = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));
  const voucher: LazyVoucher = {
    collection: collection.contractAddress as `0x${string}`,
    tokenId: BigInt(tokenIdStr),
    maxAmount: body.maxAmount,
    pricePerUnit: body.pricePerUnit,
    tokenURI: `ipfs://${nft.metadataCid}`,
    expiresAt: BigInt(Math.floor(new Date(body.expiresAt).getTime() / 1000)),
    nonce: nonceBig,
  };

  const signature = await signLazyVoucher(deps, voucher);
  const signer = voucherSignerAddress(deps).toLowerCase() as `0x${string}`;
  const hash = structHash(voucher);

  const inserted = await deps.db
    .insert(lazyVouchers)
    .values({
      nftId: nft.id,
      collectionAddress: voucher.collection.toLowerCase(),
      tokenId: tokenIdStr,
      pricePerUnit: voucher.pricePerUnit,
      maxAmount: voucher.maxAmount,
      tokenUri: voucher.tokenURI,
      expiresAt: new Date(body.expiresAt),
      nonce: voucher.nonce,
      voucherHash: hash,
      signature,
      signer,
      status: 'active',
      createdBy: actor,
    })
    .returning();

  await deps.db.insert(auditLogs).values({
    actor,
    action: 'voucher.create',
    targetTable: 'lazy_vouchers',
    targetId: inserted[0]!.id,
    after: { voucherHash: hash, pricePerUnit: voucher.pricePerUnit.toString() },
  });

  return c.json({
    id: inserted[0]!.id,
    voucher: {
      collection: voucher.collection,
      tokenId: voucher.tokenId.toString(),
      maxAmount: voucher.maxAmount.toString(),
      pricePerUnit: voucher.pricePerUnit.toString(),
      tokenURI: voucher.tokenURI,
      expiresAt: voucher.expiresAt.toString(),
      nonce: voucher.nonce.toString(),
    },
    signature,
    voucherHash: hash,
  });
});

r.post('/:id/revoke', async (c) => {
  const deps = getDeps();
  const actor = sessionAddress(c);
  const id = c.req.param('id');
  const [row] = await deps.db.select().from(lazyVouchers).where(eq(lazyVouchers.id, id)).limit(1);
  if (!row) throw new ApiError(ERROR_CODES.NOT_FOUND, 'voucher not found', 404);
  await deps.db
    .update(lazyVouchers)
    .set({ status: 'revoked' })
    .where(eq(lazyVouchers.id, id));
  await deps.db.insert(auditLogs).values({
    actor,
    action: 'voucher.revoke',
    targetTable: 'lazy_vouchers',
    targetId: id,
    before: { status: row.status },
    after: { status: 'revoked' },
  });
  // Note: on-chain revocation is a separate tx the super-admin must broadcast,
  // calling Marketplace.revokeVoucher(voucherHash).
  return c.json({ id, status: 'revoked', voucherHash: row.voucherHash });
});

export default r;
