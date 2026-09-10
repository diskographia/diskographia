const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const uploadsUrl = process.env.NEXT_PUBLIC_UPLOADS_URL ?? 'http://localhost:4000/uploads';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(response.status, body?.message ?? `запрос ${path} вернул ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fileUrl(path: string | null | undefined): string | null {
  return path ? `${uploadsUrl}/${path}` : null;
}

export function previewUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  const name = path.split('/').pop() ?? '';
  const sha256 = name.replace(/\.[^.]+$/, '');

  return `${uploadsUrl}/derivatives/${sha256.slice(0, 2)}/${sha256}_preview.webp`;
}
