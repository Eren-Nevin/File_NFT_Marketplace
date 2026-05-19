import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import {
  auditLogs,
  collections,
  lazyVouchers,
  mediaAssets,
  nfts,
} from '@nftm/db/schema';
import { zCreateNftRequest } from '@nftm/shared/schemas';
import { ApiError, ERROR_CODES } from '@nftm/shared/errors';
import type { NftMetadata } from '@nftm/shared/schemas';
import { getDeps } from '../../deps.js';
import { requireRole, sessionAddress } from '../../auth/middleware.js';

const r = new Hono();
r.use('*', requireRole('ADMIN', 'SUPER_ADMIN'));

r.post('/', async (c) => {
  const deps = getDeps();
  const actor = sessionAddress(c);
  if (!deps.pinata) {
    throw new ApiError(ERROR_CODES.INTERNAL, 'PINATA_JWT not configured', 500);
  }

  const body = zCreateNftRequest.parse(await c.req.json());

  const [collection] = await deps.db
    .select()
    .from(collections)
    .where(eq(collections.id, body.collectionId))
    .limit(1);
  if (!collection) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, 'collection not found', 404);
  }

  const [media] = await deps.db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, body.mediaAssetId))
    .limit(1);
  if (!media) throw new ApiError(ERROR_CODES.NOT_FOUND, 'media asset not found', 404);

  const externalUrl = `${deps.env.DAPP_PUBLIC_ORIGIN.replace(/\/$/, '')}/n/{id}`;
  const metadata: NftMetadata = {
    name: body.name,
    description: body.description,
    image: `ipfs://${media.previewCid}`,
    animation_url:
      media.mediaType === 'audio' || media.mediaType === 'video'
        ? `ipfs://${media.fileCid}`
        : undefined,
    external_url: externalUrl,
    attributes: [
      { trait_type: 'Type', value: media.mediaType },
      ...body.attributes,
    ],
    media: {
      type: media.mediaType,
      mime: media.mime,
      uri: `ipfs://${media.fileCid}`,
      size: media.size,
    },
  };

  const metadataCid = await deps.pinata.pinJson(metadata, body.name);

  const inserted = await deps.db
    .insert(nfts)
    .values({
      collectionId: body.collectionId,
      name: body.name,
      description: body.description,
      attributes: body.attributes,
      mediaAssetId: body.mediaAssetId,
      mediaType: media.mediaType,
      metadataCid,
      maxSupply: body.maxSupply,
    })
    .returning();

  await deps.db.insert(auditLogs).values({
    actor,
    action: 'nft.create',
    targetTable: 'nfts',
    targetId: inserted[0]!.id,
    after: { metadataCid, name: body.name, maxSupply: body.maxSupply },
  });

  return c.json(inserted[0]);
});

r.get('/', async (c) => {
  const deps = getDeps();
  const rows = await deps.db.select().from(nfts).limit(200);
  return c.json({ items: rows });
});

r.get('/:id', async (c) => {
  const deps = getDeps();
  const id = c.req.param('id');
  const [nft] = await deps.db.select().from(nfts).where(eq(nfts.id, id)).limit(1);
  if (!nft) throw new ApiError(ERROR_CODES.NOT_FOUND, 'nft not found', 404);
  const vouchers = await deps.db.select().from(lazyVouchers).where(eq(lazyVouchers.nftId, id));
  return c.json({ ...nft, vouchers });
});

export default r;
