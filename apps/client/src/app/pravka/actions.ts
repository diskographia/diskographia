'use server';

import { revalidatePath } from 'next/cache';

import { failureText } from '@/api/failure';
import { authHeaders } from '@/api/session';
import { routes } from '@/routes';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface ProfileState {
  error: string | null;
  saved: boolean;
}

export async function saveProfile(_state: ProfileState, form: FormData): Promise<ProfileState> {
  const handle = String(form.get('handle'));

  const response = await fetch(`${baseUrl}/profiles/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({
      bioMd: String(form.get('bioMd') ?? ''),
      country: String(form.get('country') ?? '').trim() || null,
      city: String(form.get('city') ?? '').trim() || null,
      tags: String(form.get('tags') ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    return { error: await failureText(response), saved: false };
  }

  revalidatePath(routes.profile(handle));
  revalidatePath(routes.profileEdit());

  return { error: null, saved: true };
}
