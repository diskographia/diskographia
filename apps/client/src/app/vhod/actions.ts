'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { failureText } from '@/api/failure';
import { apiSend } from '@/api/server';
import { SESSION_COOKIE } from '@/api/session';
import { API_URL } from '@/api/urls';
import { routes } from '@/routes';

export interface AuthState {
  error: string | null;
}

async function keepToken(token: string, expiresAt: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(expiresAt),
  });
}

export async function signIn(_state: AuthState, form: FormData): Promise<AuthState> {
  const response = await fetch(`${API_URL}/auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    cache: 'no-store',
  }).catch(() => null);

  if (!response) {
    return { error: 'сервер не отвечает' };
  }

  if (!response.ok) {
    return { error: await failureText(response) };
  }

  const { token, expiresAt } = (await response.json()) as { token: string; expiresAt: string };

  await keepToken(token, expiresAt);
  redirect(routes.home());
}

// сессия гасится на сервере, кука стирается: токен больше никуда не пустит
export async function signOut(): Promise<void> {
  await apiSend('/auth/sign-out', 'POST').catch(() => null);
  (await cookies()).delete(SESSION_COOKIE);
  redirect(routes.home());
}
