import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Enums ──────────────────────────────────────────────────────────────────
export const adminRole = pgEnum('admin_role', ['SUPER_ADMIN', 'ADMIN']);
export const sessionRole = pgEnum('session_role', ['USER', 'ADMIN', 'SUPER_ADMIN']);
export const mediaType = pgEnum('media_type', [
  'image',
  'audio',
  'video',
  'pdf',
  'doc',
  'markdown',
  'text',
]);
export const voucherStatus = pgEnum('voucher_status', ['active', 'exhausted', 'revoked']);
export const listingStatus = pgEnum('listing_status', ['active', 'sold', 'cancelled']);
export const saleKind = pgEnum('sale_kind', ['primary', 'secondary']);

// Reusable column types — addresses are stored as lowercased hex strings.
const addressCol = (name: string) => varchar(name, { length: 42 }).notNull();
const txHashCol = (name: string) => varchar(name, { length: 66 }).notNull();
const cidCol = (name: string) => varchar(name, { length: 128 }).notNull();

// ─── Users / admins / sessions ──────────────────────────────────────────────
export const users = pgTable('users', {
  address: varchar('address', { length: 42 }).primaryKey(),
  displayName: varchar('display_name', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
});

export const admins = pgTable('admins', {
  address: varchar('address', { length: 42 })
    .primaryKey()
    .references(() => users.address, { onDelete: 'cascade' }),
  role: adminRole('role').notNull(),
  addedBy: varchar('added_by', { length: 42 }),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
});

export const siweNonces = pgTable(
  'siwe_nonces',
  {
    nonce: varchar('nonce', { length: 64 }).primaryKey(),
    address: addressCol('address'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
  },
  (t) => ({
    addressIdx: index('siwe_nonces_address_idx').on(t.address),
    expiresIdx: index('siwe_nonces_expires_idx').on(t.expiresAt),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    address: addressCol('address'),
    role: sessionRole('role').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => ({
    addressIdx: index('sessions_address_idx').on(t.address),
    expiresIdx: index('sessions_expires_idx').on(t.expiresAt),
  }),
);

// ─── Media / NFTs / Collections ─────────────────────────────────────────────
export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  originalFilename: text('original_filename').notNull(),
  mime: varchar('mime', { length: 128 }).notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),
  mediaType: mediaType('media_type').notNull(),
  fileCid: cidCol('file_cid'),
  previewCid: cidCol('preview_cid'),
  uploadedBy: addressCol('uploaded_by'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
});

export const collections = pgTable(
  'collections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    chainId: integer('chain_id').notNull(),
    contractAddress: addressCol('contract_address'),
    name: varchar('name', { length: 64 }).notNull(),
    symbol: varchar('symbol', { length: 16 }).notNull(),
    royaltyBps: smallint('royalty_bps').notNull(),
    royaltyReceiver: addressCol('royalty_receiver'),
    platformFeeBps: smallint('platform_fee_bps').notNull(),
    deployer: addressCol('deployer'),
    txHash: txHashCol('tx_hash'),
    blockNumber: bigint('block_number', { mode: 'bigint' }),
    salt: varchar('salt', { length: 66 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    contractUnique: uniqueIndex('collections_contract_unique').on(t.chainId, t.contractAddress),
  }),
);

export const nfts = pgTable(
  'nfts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    tokenId: varchar('token_id', { length: 80 }), // bigint as string; null until first mint observed
    name: varchar('name', { length: 128 }).notNull(),
    description: text('description').notNull().default(''),
    attributes: jsonb('attributes').notNull().default(sql`'[]'::jsonb`),
    mediaAssetId: uuid('media_asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'restrict' }),
    mediaType: mediaType('media_type').notNull(),
    metadataCid: cidCol('metadata_cid'),
    maxSupply: integer('max_supply').notNull(),
    mintedSupply: integer('minted_supply').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    collectionIdx: index('nfts_collection_idx').on(t.collectionId),
    tokenIdx: index('nfts_token_idx').on(t.collectionId, t.tokenId),
  }),
);

// ─── Vouchers / Listings / Sales ────────────────────────────────────────────
export const lazyVouchers = pgTable(
  'lazy_vouchers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    nftId: uuid('nft_id')
      .notNull()
      .references(() => nfts.id, { onDelete: 'cascade' }),
    collectionAddress: addressCol('collection_address'),
    tokenId: varchar('token_id', { length: 80 }).notNull(),
    pricePerUnit: bigint('price_per_unit', { mode: 'bigint' }).notNull(),
    maxAmount: bigint('max_amount', { mode: 'bigint' }).notNull(),
    soldAmount: bigint('sold_amount', { mode: 'bigint' }).notNull().default(sql`0`),
    tokenUri: text('token_uri').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    nonce: bigint('nonce', { mode: 'bigint' }).notNull(),
    voucherHash: varchar('voucher_hash', { length: 66 }).notNull(),
    signature: text('signature').notNull(),
    signer: addressCol('signer'),
    status: voucherStatus('status').notNull().default('active'),
    createdBy: addressCol('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    voucherHashUnique: uniqueIndex('lazy_vouchers_hash_unique').on(t.voucherHash),
    nftIdx: index('lazy_vouchers_nft_idx').on(t.nftId),
    statusIdx: index('lazy_vouchers_status_idx').on(t.status),
  }),
);

export const listings = pgTable(
  'listings',
  {
    // primary key = on-chain listingId hex (bytes32)
    id: varchar('id', { length: 66 }).primaryKey(),
    seller: addressCol('seller'),
    collectionId: uuid('collection_id').references(() => collections.id),
    collectionAddress: addressCol('collection_address'),
    tokenId: varchar('token_id', { length: 80 }).notNull(),
    amountInitial: bigint('amount_initial', { mode: 'bigint' }).notNull(),
    amountRemaining: bigint('amount_remaining', { mode: 'bigint' }).notNull(),
    pricePerUnit: bigint('price_per_unit', { mode: 'bigint' }).notNull(),
    status: listingStatus('status').notNull().default('active'),
    txHashCreated: txHashCol('tx_hash_created'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sellerIdx: index('listings_seller_idx').on(t.seller),
    collectionIdx: index('listings_collection_idx').on(t.collectionId),
    statusIdx: index('listings_status_idx').on(t.status),
  }),
);

export const sales = pgTable(
  'sales',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    chainId: integer('chain_id').notNull(),
    txHash: txHashCol('tx_hash'),
    logIndex: integer('log_index').notNull(),
    blockNumber: bigint('block_number', { mode: 'bigint' }).notNull(),
    kind: saleKind('kind').notNull(),
    voucherId: uuid('voucher_id').references(() => lazyVouchers.id),
    listingId: varchar('listing_id', { length: 66 }),
    buyer: addressCol('buyer'),
    seller: varchar('seller', { length: 42 }),
    collectionId: uuid('collection_id').references(() => collections.id),
    collectionAddress: addressCol('collection_address'),
    tokenId: varchar('token_id', { length: 80 }).notNull(),
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    pricePaid: bigint('price_paid', { mode: 'bigint' }).notNull(),
    royaltyAmount: bigint('royalty_amount', { mode: 'bigint' }).notNull().default(sql`0`),
    platformFeeAmount: bigint('platform_fee_amount', { mode: 'bigint' }).notNull().default(sql`0`),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
    finalized: boolean('finalized').notNull().default(false),
  },
  (t) => ({
    chainTxLogUnique: uniqueIndex('sales_tx_log_unique').on(t.chainId, t.txHash, t.logIndex),
    buyerIdx: index('sales_buyer_idx').on(t.buyer),
    collectionIdx: index('sales_collection_idx').on(t.collectionId),
  }),
);

// ─── Views ──────────────────────────────────────────────────────────────────
export const nftViews = pgTable(
  'nft_views',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    nftId: uuid('nft_id')
      .notNull()
      .references(() => nfts.id, { onDelete: 'cascade' }),
    viewerAddress: varchar('viewer_address', { length: 42 }),
    viewerIpHash: varchar('viewer_ip_hash', { length: 64 }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ nftIdx: index('nft_views_nft_idx').on(t.nftId) }),
);

export const nftViewStats = pgTable(
  'nft_view_stats',
  {
    nftId: uuid('nft_id')
      .notNull()
      .references(() => nfts.id, { onDelete: 'cascade' }),
    day: varchar('day', { length: 10 }).notNull(), // YYYY-MM-DD
    viewCount: integer('view_count').notNull().default(0),
  },
  (t) => ({ pk: primaryKey({ columns: [t.nftId, t.day] }) }),
);

// ─── Indexer / audit ────────────────────────────────────────────────────────
export const indexerCursors = pgTable(
  'indexer_cursors',
  {
    chainId: integer('chain_id').notNull(),
    contractAddress: varchar('contract_address', { length: 42 }).notNull(),
    lastBlock: bigint('last_block', { mode: 'bigint' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.chainId, t.contractAddress] }) }),
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actor: addressCol('actor'),
    action: varchar('action', { length: 64 }).notNull(),
    targetTable: varchar('target_table', { length: 64 }),
    targetId: varchar('target_id', { length: 80 }),
    before: jsonb('before'),
    after: jsonb('after'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ actorIdx: index('audit_logs_actor_idx').on(t.actor) }),
);
