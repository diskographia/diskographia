import { notFound } from 'next/navigation';

import { apiGet } from '@/api/client';
import { authHeaders } from '@/api/session';
import { currentViewer } from '@/api/viewer';
import { ListScreen } from '@/components/layout/list-screen';

import { ModerationList, type Row } from './moderation-list';

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

  const rows = await apiGet<Row[]>(`/admin/objects?deleted=${showDeleted}`, {
    headers: await authHeaders(),
  }).catch(() => []);

  return (
    <ListScreen
      title={showDeleted ? 'модерация: удалённое' : 'модерация'}
      list={<ModerationList rows={rows} showDeleted={showDeleted} />}
      info={<p>объектов в списке: {rows.length}</p>}
      text={
        <div>
          <h2>права платформы</h2>
          <p>Это единственное место, где платформа трогает чужие объекты.</p>
          <p>«спрятать» ставит видимость «только автор», объект остаётся у автора.</p>
          <p>«удалить» делает то же, что кнопка автора: объект гаснет, но лежит в удалённом.</p>
        </div>
      }
    />
  );
}
