import { cookies } from 'next/headers';

import { apiGet } from './client';

export const SESSION_COOKIE = 'diskographia_session';

export interface Identity {
  profileId: string;
  handle: string;
}

export async function readToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function currentIdentity(): Promise<Identity | null> {
  const token = await readToken();

  if (!token) {
    return null;
  }

  return apiGet<Identity>('/auth/me', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
}

export async function authHeaders(): Promise<Record<string, string>> {
  const token = await readToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}
