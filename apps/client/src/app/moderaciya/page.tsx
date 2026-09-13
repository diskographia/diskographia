import { notFound } from 'next/navigation';

import { apiGet } from '@/api/server';
import type { ModerationRow } from '@/api/types';
import { currentViewer } from '@/api/viewer';
import { ListScreen } from '@/components/layout/list-screen';

import { ModerationList } from './moderation-list';

interface PageProps {
  searchParams: Promise<{ deleted?: string }>;
}

export default async function ModerationPage({ searchParams }: PageProps) {
  const viewer = await currentViewer();

  if (!viewer?.isAdmin) {
    notFound();
  }

  const { deleted } = await searchParams;
  const showDeleted = deleted === 'true';

  const rows = await apiGet<ModerationRow[]>(`/admin/objects?deleted=${showDeleted}`).catch(() => []);

  return (
    <ListScreen
      title={showDeleted ? 'модерация: удалённое' : 'модерация'}
      list={<ModerationList rows={rows} showDeleted={showDeleted} />}
      info={<p>Предметов в списке: {rows.length}.</p>}
      text={
        <div>
          <h2>права платформы</h2>
          <p>Это единственное место, где платформа трогает чужие предметы.</p>
          <p>«Спрятать» ставит видимость «только я», предмет остаётся у автора.</p>
          <p>«Удалить» делает то же, что кнопка автора: предмет гаснет, но лежит в удалённом.</p>
        </div>
      }
    />
  );
}
