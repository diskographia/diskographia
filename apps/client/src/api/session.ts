import { cache } from 'react';

import { SESSION_COOKIE, type Identity } from '@diskographia/shared';
import { cookies } from 'next/headers';

import { API_URL } from './urls';

export { SESSION_COOKIE };
export type { Identity };

export const readToken = cache(async (): Promise<string | null> => {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
});

// одна проверка токена на запрос: раскладка, полоса и страница читают одно и то же
export const currentIdentity = cache(async (): Promise<Identity | null> => {
  const token = await readToken();

  if (!token) {
    return null;
  }

  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    cache: 'no-store',
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  return response.json() as Promise<Identity>;
});

export async function authHeaders(): Promise<Record<string, string>> {
  const token = await readToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}
