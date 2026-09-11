'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { SESSION_COOKIE } from '@/api/session';
import { routes } from '@/routes';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface AuthState {
  error: string | null;
}

async function keepToken(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
  });
}

async function failure(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
  const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;

  return message ?? fallback;
}

export async function signIn(_state: AuthState, form: FormData): Promise<AuthState> {
  const response = await fetch(`${baseUrl}/auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    cache: 'no-store',
  });

  if (!response.ok) {
    return { error: await failure(response, 'войти не удалось') };
  }

  const { token } = (await response.json()) as { token: string };

  await keepToken(token);
  redirect(routes.home());
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect(routes.home());
}
