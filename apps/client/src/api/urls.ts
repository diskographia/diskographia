export const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

// внутри стенда сервер ближе по сети compose, чем через caddy; в браузер эта переменная не попадает
export const API_URL = process.env.API_INTERNAL_URL ?? PUBLIC_API_URL;

const uploadsUrl = process.env.NEXT_PUBLIC_UPLOADS_URL ?? 'http://localhost:4000/uploads';

export function fileUrl(path: string | null | undefined): string | null {
  return path ? `${uploadsUrl}/${path}` : null;
}

// раскладка производных повторяет StorageService.derivativePath на сервере
export function previewUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  const name = path.split('/').pop() ?? '';
  const sha256 = name.replace(/\.[^.]+$/, '');

  return `${uploadsUrl}/derivatives/${sha256.slice(0, 2)}/${sha256}_preview.webp`;
}
