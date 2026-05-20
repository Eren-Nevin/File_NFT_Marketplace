import type { lazyVouchers } from '@nftm/db/schema';

type LazyVoucherRow = typeof lazyVouchers.$inferSelect;

// Convert a lazy_vouchers row (with JS BigInts and a Date) to the wire shape
// expected by SDK consumers (zVoucher). Required because JSON.stringify cannot
// serialize BigInt.
export function serializeVoucher(row: LazyVoucherRow) {
  return {
    id: row.id,
    nftId: row.nftId,
    collection: row.collectionAddress,
    tokenId: row.tokenId,
    pricePerUnit: row.pricePerUnit.toString(),
    maxAmount: row.maxAmount.toString(),
    soldAmount: row.soldAmount.toString(),
    tokenURI: row.tokenUri,
    expiresAt: row.expiresAt.toISOString(),
    nonce: row.nonce.toString(),
    voucherHash: row.voucherHash,
    signature: row.signature,
    signer: row.signer,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}
