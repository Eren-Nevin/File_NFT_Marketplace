import type { MediaType } from '@nftm/shared/roles';

// Preview generation is a stub for V1 — returns the original file's bytes for
// images, and a tiny 1×1 PNG placeholder for everything else. Wire in sharp/
// ffmpeg/pdf-poppler/markdown-it + puppeteer later. This keeps the upload flow
// runnable end-to-end without forcing native binaries into the image yet.
const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

export interface PreviewResult {
  data: Buffer;
  mime: string;
  filename: string;
}

export async function generatePreview(args: {
  mediaType: MediaType;
  filename: string;
  mime: string;
  data: Uint8Array | Buffer;
}): Promise<PreviewResult> {
  if (args.mediaType === 'image') {
    return { data: Buffer.from(args.data), mime: args.mime, filename: args.filename };
  }
  return {
    data: PLACEHOLDER_PNG,
    mime: 'image/png',
    filename: `${args.filename.replace(/\.[^.]+$/, '')}-preview.png`,
  };
}
