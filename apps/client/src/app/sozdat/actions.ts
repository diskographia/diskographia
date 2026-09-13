'use server';

import { redirect } from 'next/navigation';

import { entityPayload } from '@/api/entity-form';
import { failureText } from '@/api/failure';
import { apiSend } from '@/api/server';
import { currentIdentity } from '@/api/session';
import type { EntityKind } from '@/api/types';
import { routes } from '@/routes';

export interface CreateState {
  error: string | null;
  created?: { id: string; handle: string; slug: string };
}

export async function createEntity(_state: CreateState, form: FormData): Promise<CreateState> {
  const identity = await currentIdentity();

  if (!identity) {
    redirect(routes.signIn());
  }

  const kind = String(form.get('kind')) as EntityKind;
  const response = await apiSend('/entities', 'POST', { kind, ...entityPayload(form, kind) });

  if (!response.ok) {
    return { error: await failureText(response) };
  }

  const created = (await response.json()) as { id: string; slug: string };

  // дальше клиент: догружает собранные файлы и сам уходит в правку
  return { error: null, created: { id: created.id, handle: identity.handle, slug: created.slug } };
}
