'use server';

import { revalidatePath } from 'next/cache';

import { failureText } from '@/api/failure';
import { apiSend } from '@/api/server';
import { routes } from '@/routes';

export interface ProfileState {
  error: string | null;
  savedAt: number | null;
}

export async function saveProfile(_state: ProfileState, form: FormData): Promise<ProfileState> {
  const handle = String(form.get('handle'));

  const response = await apiSend('/profiles/me', 'PATCH', {
    bioMd: String(form.get('bioMd') ?? ''),
    country: String(form.get('country') ?? '').trim() || null,
    city: String(form.get('city') ?? '').trim() || null,
    tags: String(form.get('tags') ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  });

  if (!response.ok) {
    return { error: await failureText(response), savedAt: null };
  }

  revalidatePath(routes.profile(handle));
  revalidatePath(routes.profileEdit());

  return { error: null, savedAt: Date.now() };
}
