import { notFound, redirect } from 'next/navigation';

import { apiGet, fileUrl } from '@/api/client';
import { parseHandle } from '@/api/handle';
import { authHeaders, currentIdentity } from '@/api/session';
import { currentViewer } from '@/api/viewer';
import type { EntityCard, EntityPage, ScheduleEntry } from '@/api/types';

import { EditForm } from './edit-form';
import { routes } from '@/routes';

interface PageProps {
  params: Promise<{ handle: string; slug: string }>;
}

interface Abilities {
  owner: boolean;
  edit: boolean;
  pin: boolean;
}

export default async function EditEntityPage({ params }: PageProps) {
  const { handle, slug } = await params;
  const nickname = parseHandle(handle);

  if (!nickname) {
    notFound();
  }

  const identity = await currentIdentity();

  if (!identity) {
    redirect(routes.signIn());
  }

  const headers = await authHeaders();
  const page = await apiGet<EntityPage>(`/profiles/${nickname}/objects/${slug}`, { headers }).catch(() => null);

  if (!page) {
    notFound();
  }

  const abilities = await apiGet<Abilities>(`/entities/${page.entity.id}/abilities`, { headers }).catch(() => null);

  // кто не может править, тот видит обычную страницу
  if (!abilities?.edit) {
    redirect(routes.entity(nickname, slug));
  }

  const owned = await apiGet<EntityCard[]>('/entities/mine', { headers }).catch(() => []);
  const schedule =
    page.entity.kind === 'event'
      ? await apiGet<ScheduleEntry[]>(`/feed/events/${page.entity.id}/schedule`).catch(() => [])
      : [];
  const cover = page.media.find((item) => item.media.kind === 'image');

  return (
    <EditForm
      entity={page.entity}
      handle={nickname}
      cover={cover?.file ? fileUrl(cover.file.path) : null}
      media={page.media}
      nested={page.children}
      owned={owned}
      canPin={abilities.pin}
      owner={abilities.owner}
      platform={!!(await currentViewer())?.isAdmin}
      schedule={schedule}
    />
  );
}
