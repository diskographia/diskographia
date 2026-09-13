'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { failureText } from '@/api/failure';
import { apiSend } from '@/api/server';
import { SESSION_COOKIE } from '@/api/session';
import { routes } from '@/routes';

export interface SettingsState {
  error: string | null;
  saved: boolean;
}

const SWITCHES = ['notifyChild', 'notifyApplication', 'notifyFeedback', 'notifyCollaborator'] as const;

export async function saveSettings(_state: SettingsState, form: FormData): Promise<SettingsState> {
  const response = await apiSend(
    '/notifications/settings',
    'PATCH',
    Object.fromEntries(SWITCHES.map((name) => [name, form.get(name) === 'on'])),
  );

  if (!response.ok) {
    return { error: await failureText(response), saved: false };
  }

  revalidatePath(routes.settings());

  return { error: null, saved: true };
}

export async function changePassword(_state: SettingsState, form: FormData): Promise<SettingsState> {
  const next = String(form.get('next') ?? '');

  if (next !== String(form.get('again') ?? '')) {
    return { error: 'новый пароль набран по-разному', saved: false };
  }

  const response = await apiSend('/auth/password', 'PATCH', { current: String(form.get('current') ?? ''), next });

  if (!response.ok) {
    return { error: await failureText(response), saved: false };
  }

  return { error: null, saved: true };
}

// закрытие подтверждается паролем: без него сервер откажет
export async function closeAccount(_state: SettingsState, form: FormData): Promise<SettingsState> {
  const response = await apiSend('/profiles/me', 'DELETE', { password: String(form.get('password') ?? '') });

  if (!response.ok) {
    return { error: await failureText(response), saved: false };
  }

  (await cookies()).delete(SESSION_COOKIE);
  redirect(routes.home());
}
