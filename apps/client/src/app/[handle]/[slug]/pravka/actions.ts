'use server';

import { revalidatePath } from 'next/cache';

import { entityPayload } from '@/api/entity-form';
import { failureText } from '@/api/failure';
import { apiSend } from '@/api/server';
import type { EntityKind } from '@/api/types';
import { routes } from '@/routes';

export interface FormState {
  error: string | null;
  savedAt: number | null;
}

export async function saveEntity(_state: FormState, form: FormData): Promise<FormState> {
  const id = String(form.get('id'));
  const kind = String(form.get('kind')) as EntityKind;
  const response = await apiSend(`/entities/${id}`, 'PATCH', entityPayload(form, kind));

  if (!response.ok) {
    return { error: await failureText(response), savedAt: null };
  }

  const handle = String(form.get('handle'));
  const slug = String(form.get('slug'));

  revalidatePath(routes.entity(handle, slug));
  revalidatePath(routes.entityEdit(handle, slug));

  return { error: null, savedAt: Date.now() };
}
