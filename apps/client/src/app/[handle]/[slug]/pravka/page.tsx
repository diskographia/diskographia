import { notFound, redirect } from 'next/navigation';

import { parseHandle } from '@/api/handle';
import { apiGet } from '@/api/server';
import { fileUrl } from '@/api/urls';
import type { Abilities, EntityCard, EntityPage, ScheduleEntry } from '@/api/types';
import { currentViewer } from '@/api/viewer';
import { routes } from '@/routes';

import { EditForm } from './edit-form';

interface PageProps {
  params: Promise<{ handle: string; slug: string }>;
}

export default async function EditEntityPage({ params }: PageProps) {
  const [{ handle, slug }, viewer] = await Promise.all([params, currentViewer()]);
  const nickname = parseHandle(handle);

  if (!nickname) {
    notFound();
  }

  if (!viewer) {
    redirect(routes.signIn());
  }

  const page = await apiGet<EntityPage>(`/profiles/${nickname}/objects/${slug}`).catch(() => null);

  if (!page) {
    notFound();
  }

  const abilities = await apiGet<Abilities>(`/entities/${page.entity.id}/abilities`).catch(() => null);

  // кто не может править, тот видит обычную страницу
  if (!abilities?.edit) {
    redirect(routes.entity(nickname, slug));
  }

  const [owned, schedule] = await Promise.all([
    apiGet<EntityCard[]>('/entities/mine').catch(() => []),
    page.entity.kind === 'event'
      ? apiGet<ScheduleEntry[]>(`/feed/events/${page.entity.id}/schedule`).catch(() => [])
      : Promise.resolve([]),
  ]);

  const cover = page.media.find((item) => item.media.kind === 'image' && item.file);

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
      platform={viewer.isAdmin}
      schedule={schedule}
    />
  );
}
