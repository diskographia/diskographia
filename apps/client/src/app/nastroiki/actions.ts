'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { failureText } from '@/api/failure';
import { SESSION_COOKIE, authHeaders } from '@/api/session';
import { routes } from '@/routes';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface SettingsState {
  error: string | null;
  saved: boolean;
}

const SWITCHES = ['notifyChild', 'notifyApplication', 'notifyFeedback', 'notifyCollaborator'] as const;

export async function saveSettings(_state: SettingsState, form: FormData): Promise<SettingsState> {
  const response = await fetch(`${baseUrl}/notifications/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(Object.fromEntries(SWITCHES.map((name) => [name, form.get(name) === 'on']))),
    cache: 'no-store',
  });

  if (!response.ok) {
    return { error: await failureText(response), saved: false };
  }

  revalidatePath(routes.settings());

  return { error: null, saved: true };
}

export async function closeAccount(): Promise<void> {
  const response = await fetch(`${baseUrl}/profiles/me`, {
    method: 'DELETE',
    headers: await authHeaders(),
    cache: 'no-store',
  });

  if (response.ok) {
    (await cookies()).delete(SESSION_COOKIE);
  }

  redirect(routes.home());
}
