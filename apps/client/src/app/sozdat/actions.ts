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

  const created = (await response.json()) as { slug: string };

  // сразу в правку: там прикрепляется медиа
  redirect(routes.entityEdit(identity.handle, created.slug));
}
