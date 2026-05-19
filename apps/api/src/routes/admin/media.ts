import { Hono } from 'hono';
import { mediaAssets, auditLogs } from '@nftm/db/schema';
import { mediaTypeFromMime } from '@nftm/shared/roles';
import { ApiError, ERROR_CODES } from '@nftm/shared/errors';
import { getDeps } from '../../deps.js';
import { requireRole, sessionAddress } from '../../auth/middleware.js';
import { generatePreview } from '../../services/preview.js';

const r = new Hono();
r.use('*', requireRole('ADMIN', 'SUPER_ADMIN'));

/// Single-shot multipart upload — file is sent in the same request body that
/// triggers IPFS pinning. The browser POSTs multipart/form-data with a single
/// `file` field. Suitable for ≤100 MB which is our hard cap.
r.post('/upload', async (c) => {
  const deps = getDeps();
  const actor = sessionAddress(c);
  if (!deps.pinata) {
    throw new ApiError(ERROR_CODES.INTERNAL, 'PINATA_JWT not configured', 500);
  }

  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    throw new ApiError(ERROR_CODES.VALIDATION, 'file field required', 400);
  }
  if (file.size > deps.env.MEDIA_MAX_BYTES) {
    throw new ApiError(
      ERROR_CODES.MEDIA_TOO_LARGE,
      `file > ${deps.env.MEDIA_MAX_BYTES} bytes`,
      413,
    );
  }
  const mediaType = mediaTypeFromMime(file.type);
  if (!mediaType) {
    throw new ApiError(ERROR_CODES.MEDIA_UNSUPPORTED, `mime ${file.type} not supported`, 415);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const fileCid = await deps.pinata.pinFile({
    filename: file.name,
    mime: file.type,
    data: bytes,
  });

  const preview = await generatePreview({
    mediaType,
    filename: file.name,
    mime: file.type,
    data: bytes,
  });
  const previewCid = await deps.pinata.pinFile(preview);

  const inserted = await deps.db
    .insert(mediaAssets)
    .values({
      originalFilename: file.name,
      mime: file.type,
      size: file.size,
      mediaType,
      fileCid,
      previewCid,
      uploadedBy: actor,
    })
    .returning();

  await deps.db.insert(auditLogs).values({
    actor,
    action: 'media.upload',
    targetTable: 'media_assets',
    targetId: inserted[0]!.id,
    after: { fileCid, previewCid, mediaType },
  });

  return c.json(inserted[0]);
});

export default r;
