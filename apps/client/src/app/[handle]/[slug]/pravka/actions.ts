'use server';

import { revalidatePath } from 'next/cache';

import { entityPayload } from '@/api/entity-form';
import { authHeaders } from '@/api/session';
import type { EntityKind } from '@/api/types';
import { failureText } from '@/api/failure';
import { routes } from '@/routes';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface FormState {
  error: string | null;
  saved: boolean;
}

async function send(path: string, method: string, body: unknown): Promise<string | null> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });

  if (response.ok) {
    return null;
  }

  return failureText(response);
}

export async function saveEntity(_state: FormState, form: FormData): Promise<FormState> {
  const id = String(form.get('id'));
  const kind = String(form.get('kind'));

  const payload = entityPayload(form, kind as EntityKind);

  const error = await send(`/entities/${id}`, 'PATCH', payload);

  if (!error) {
    const handle = String(form.get('handle'));
    const slug = String(form.get('slug'));

    revalidatePath(routes.entity(handle, slug));
    revalidatePath(routes.entityEdit(handle, slug));
  }

  return { error, saved: !error };
}
