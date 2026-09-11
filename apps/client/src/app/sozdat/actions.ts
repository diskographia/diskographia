'use server';

import { redirect } from 'next/navigation';

import { entityPayload } from '@/api/entity-form';
import { authHeaders, currentIdentity } from '@/api/session';
import type { EntityKind } from '@/api/types';
import { failureText } from '@/api/failure';
import { routes } from '@/routes';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface CreateState {
  error: string | null;
}

export async function createEntity(_state: CreateState, form: FormData): Promise<CreateState> {
  const identity = await currentIdentity();

  if (!identity) {
    redirect(routes.signIn());
  }

  const kind = String(form.get('kind')) as EntityKind;

  const response = await fetch(`${baseUrl}/entities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ kind, ...entityPayload(form, kind) }),
    cache: 'no-store',
  });

  if (!response.ok) {
    return { error: await failureText(response) };
  }

  const created = (await response.json()) as { slug: string };

  // сразу в правку: там прикрепляется медиа
  redirect(routes.entityEdit(identity.handle, created.slug));
}
