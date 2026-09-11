import { extname } from 'node:path';
import type { ServerResponse } from 'node:http';

const INLINE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif',
  '.mp3', '.flac', '.wav', '.ogg',
  '.mp4', '.webm', '.mov',
]);

export const UPLOADS_PREFIX = '/uploads';

// в бою раздаёт nginx, заголовки должны совпадать с его конфигом
export function setUploadHeaders(response: ServerResponse, path: string): void {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");

  if (!INLINE_EXTENSIONS.has(extname(path).toLowerCase())) {
    response.setHeader('Content-Disposition', 'attachment');
  }
}
