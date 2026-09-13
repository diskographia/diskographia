import { authHeaders } from './session';
import { API_URL } from './urls';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// серверный запрос к api с токеном из куки, без кэша
export async function apiRequest(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...(await authHeaders()), ...init.headers },
    cache: 'no-store',
  });
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiRequest(path, init);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(response.status, body?.message ?? `запрос ${path} вернул ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function apiSend(path: string, method: string, body?: unknown): Promise<Response> {
  return apiRequest(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
