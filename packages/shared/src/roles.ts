export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const SESSION_ROLES = ['USER', 'ADMIN', 'SUPER_ADMIN'] as const;
export type SessionRole = (typeof SESSION_ROLES)[number];

export const MEDIA_TYPES = ['image', 'audio', 'video', 'pdf', 'doc', 'markdown', 'text'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

// MIME → MediaType mapping. Anything not listed is rejected at upload time.
export const MIME_TO_MEDIA_TYPE: Record<string, MediaType> = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'audio/mpeg': 'audio',
  'audio/mp3': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/flac': 'audio',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'doc',
  'text/markdown': 'markdown',
  'text/x-markdown': 'markdown',
  'text/plain': 'text',
};

export function mediaTypeFromMime(mime: string): MediaType | undefined {
  return MIME_TO_MEDIA_TYPE[mime.toLowerCase()];
}
