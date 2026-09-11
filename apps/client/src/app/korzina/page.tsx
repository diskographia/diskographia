import { notFound } from 'next/navigation';

import { apiGet } from '@/api/client';
import { authHeaders } from '@/api/session';
import { requireService } from '@/api/viewer';
import { ListScreen } from '@/components/layout/list-screen';

import { RestoreButton } from './restore-button';

interface Deleted {
  id: string;
  kind: string;
  title: string;
  slug: string;
  visibility: string;
  feedbackCount: number;
  deletedAt: string;
}

const KIND: Record<string, string> = {
  event: 'ивент',
  capsule: 'капсула',
  content: 'контент',
  product: 'товар',
};

const stamp = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default async function TrashPage() {
  const viewer = await requireService();

  if (!viewer) {
    notFound();
  }

  const items = await apiGet<Deleted[]>('/entities/deleted', { headers: await authHeaders() }).catch(() => []);

  return (
    <ListScreen
      title="корзина"
      list={
        <>
          {items.length === 0 ? <p>удалённого нет</p> : null}

          <ul>
            {items.map((item) => (
              <li key={item.id} className="frame mb-2 flex flex-wrap items-center gap-2 p-2">
                <span className="flex-1">
                  {item.title}
                  <span className="hint">
                    {KIND[item.kind] ?? item.kind}, откликов {item.feedbackCount}, удалён{' '}
                    {stamp.format(new Date(item.deletedAt))}
                  </span>
                </span>

                <RestoreButton entityId={item.id} />
              </li>
            ))}
          </ul>
        </>
      }
      info={<p>в корзине: {items.length}</p>}
      text={
        <div>
          <h2>что значит удалён</h2>
          <p>Удалённый объект не открывается ни по адресу, ни в поиске.</p>
          <p>Там, где его положили другие, остаётся след «объект удалён».</p>
          <p>Пока он в корзине, его отклики не считаются в вашем отклике. Вернёте, и они вернутся.</p>
        </div>
      }
    />
  );
}
