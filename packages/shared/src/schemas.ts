import { z } from 'zod';
import { ADMIN_ROLES, MEDIA_TYPES } from './roles.js';

// ─── Primitives ─────────────────────────────────────────────────────────────
export const zAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'invalid EVM address')
  .transform((v) => v as `0x${string}`);

export const zHex = z
  .string()
  .regex(/^0x[a-fA-F0-9]*$/, 'invalid hex')
  .transform((v) => v as `0x${string}`);

export const zBigIntString = z
  .string()
  .regex(/^\d+$/, 'must be a non-negative integer string')
  .transform((v) => BigInt(v));

export const zTxHash = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'invalid tx hash')
  .transform((v) => v as `0x${string}`);

export const zChainId = z.number().int().positive();

export const zCid = z.string().min(10).max(128);

// ─── Auth ───────────────────────────────────────────────────────────────────
export const zSiweNonceRequest = z.object({
  address: zAddress,
});
export type SiweNonceRequest = z.infer<typeof zSiweNonceRequest>;

export const zSiweVerifyRequest = z.object({
  message: z.string().min(1),
  signature: zHex,
});
export type SiweVerifyRequest = z.infer<typeof zSiweVerifyRequest>;

export const zSession = z.object({
  address: zAddress,
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});
export type Session = z.infer<typeof zSession>;

// ─── Admin allowlist ────────────────────────────────────────────────────────
export const zAdminRole = z.enum(ADMIN_ROLES);
export const zAddAdminRequest = z.object({
  address: zAddress,
  role: zAdminRole,
});
export type AddAdminRequest = z.infer<typeof zAddAdminRequest>;

// ─── Media upload ───────────────────────────────────────────────────────────
export const zMediaType = z.enum(MEDIA_TYPES);

export const zMediaFinalizeRequest = z.object({
  filename: z.string().min(1).max(256),
  mime: z.string().min(1).max(128),
  size: z.number().int().positive().max(1024 * 1024 * 1024), // 1GB ceiling; finer cap enforced at runtime
});
export type MediaFinalizeRequest = z.infer<typeof zMediaFinalizeRequest>;

export const zMediaAsset = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  mime: z.string(),
  size: z.number().int(),
  mediaType: zMediaType,
  fileCid: zCid,
  previewCid: zCid,
  uploadedAt: z.string().datetime(),
});
export type MediaAsset = z.infer<typeof zMediaAsset>;

// ─── Collections / NFTs ─────────────────────────────────────────────────────
export const zCreateCollectionRequest = z.object({
  name: z.string().min(1).max(64),
  symbol: z.string().min(1).max(16),
  royaltyReceiver: zAddress,
  royaltyBps: z.number().int().min(0).max(1000), // ≤10%
  platformFeeBps: z.number().int().min(0).max(500), // ≤5%
});
export type CreateCollectionRequest = z.infer<typeof zCreateCollectionRequest>;

export const zCollection = z.object({
  id: z.string().uuid(),
  chainId: zChainId,
  contractAddress: zAddress,
  name: z.string(),
  symbol: z.string(),
  royaltyBps: z.number().int(),
  royaltyReceiver: zAddress,
  platformFeeBps: z.number().int(),
  deployer: zAddress,
  txHash: zTxHash,
  createdAt: z.string().datetime(),
  archivedAt: z.string().datetime().nullable().optional(),
});
export type Collection = z.infer<typeof zCollection>;

export const zAttribute = z.object({
  trait_type: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export const zCreateNftRequest = z.object({
  collectionId: z.string().uuid(),
  name: z.string().min(1).max(128),
  description: z.string().max(2000).default(''),
  attributes: z.array(zAttribute).default([]),
  mediaAssetId: z.string().uuid(),
  maxSupply: z.number().int().positive(),
});
export type CreateNftRequest = z.infer<typeof zCreateNftRequest>;

export const zNft = z.object({
  id: z.string().uuid(),
  collectionId: z.string().uuid(),
  tokenId: z.string().nullable(), // bigint as string; null until first mint
  name: z.string(),
  description: z.string(),
  attributes: z.array(zAttribute),
  mediaType: zMediaType,
  metadataCid: zCid,
  fileCid: zCid,
  previewCid: zCid,
  maxSupply: z.number().int(),
  mintedSupply: z.number().int(),
  createdAt: z.string().datetime(),
});
export type Nft = z.infer<typeof zNft>;

// ─── Vouchers ───────────────────────────────────────────────────────────────
export const zCreateVoucherRequest = z.object({
  nftId: z.string().uuid(),
  pricePerUnit: zBigIntString, // USDC, 6 decimals, as string
  maxAmount: zBigIntString,
  expiresAt: z.string().datetime(),
});
export type CreateVoucherRequest = z.infer<typeof zCreateVoucherRequest>;

export const zVoucher = z.object({
  id: z.string().uuid(),
  nftId: z.string().uuid(),
  collection: zAddress,
  tokenId: z.string(),
  pricePerUnit: z.string(),
  maxAmount: z.string(),
  soldAmount: z.string(),
  tokenURI: z.string(),
  expiresAt: z.string().datetime(),
  nonce: z.string(),
  signature: zHex,
  signer: zAddress,
  status: z.enum(['active', 'exhausted', 'revoked']),
});
export type Voucher = z.infer<typeof zVoucher>;

// ─── ERC-721/1155 metadata JSON (the file we pin to IPFS) ───────────────────
export const zNftMetadata = z.object({
  name: z.string(),
  description: z.string(),
  image: z.string(), // ipfs://<preview_cid>
  animation_url: z.string().optional(),
  external_url: z.string().url().optional(),
  attributes: z.array(zAttribute).default([]),
  media: z.object({
    type: zMediaType,
    mime: z.string(),
    uri: z.string(), // ipfs://<file_cid>
    size: z.number().int(),
  }),
});
export type NftMetadata = z.infer<typeof zNftMetadata>;
