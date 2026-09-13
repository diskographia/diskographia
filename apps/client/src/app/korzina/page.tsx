import { notFound } from 'next/navigation';

import { apiGet } from '@/api/server';
import { ZONE } from '@/api/time';
import type { DeletedEntity } from '@/api/types';
import { requireService } from '@/api/viewer';
import { kindLabel } from '@/components/entity/labels';
import { ListScreen } from '@/components/layout/list-screen';

import { RestoreButton } from './restore-button';

const stamp = new Intl.DateTimeFormat('ru-RU', { timeZone: ZONE, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default async function TrashPage() {
  const viewer = await requireService();

  if (!viewer) {
    notFound();
  }

  const items = await apiGet<DeletedEntity[]>('/entities/deleted').catch(() => []);

  return (
    <ListScreen
      title="корзина"
      list={
        <>
          {items.length === 0 ? <p>Удалённого нет.</p> : null}

          <ul>
            {items.map((item) => (
              <li key={item.id} className="frame mb-2 flex flex-wrap items-center gap-2 p-2">
                <span className="flex-1">
                  {item.title}
                  <span className="hint">
                    {kindLabel(item.kind)}, откликов {item.feedbackCount}, удалён {stamp.format(new Date(item.deletedAt))}
                  </span>
                </span>

                <RestoreButton entityId={item.id} />
              </li>
            ))}
          </ul>
        </>
      }
      info={<p>В корзине: {items.length}.</p>}
      text={
        <div>
          <h2>что значит удалён</h2>
          <p>Удалённый предмет не открывается ни по адресу, ни в поиске.</p>
          <p>Там, где его положили другие, остаётся след «предмет удалён».</p>
          <p>Пока он в корзине, его отклики не считаются в вашем отклике. Вернёте, и они вернутся.</p>
        </div>
      }
    />
  );
}
