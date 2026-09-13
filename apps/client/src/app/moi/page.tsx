import Link from 'next/link';
import { notFound } from 'next/navigation';

import { apiGet } from '@/api/server';
import type { OwnedCard } from '@/api/types';
import { requireService } from '@/api/viewer';
import { kindLabel, visibilityLabel } from '@/components/entity/labels';
import { ListScreen } from '@/components/layout/list-screen';
import { Hint } from '@/components/ui/hint';
import { MANIFEST_SLUG, SELECTION_SLUG, SHOWCASE_SLUG } from '@/platform';
import { routes } from '@/routes';

export default async function MinePage() {
  const identity = await requireService();

  if (!identity) {
    notFound();
  }

  const service = new Set([SELECTION_SLUG, SHOWCASE_SLUG, MANIFEST_SLUG]);
  const owned = (await apiGet<OwnedCard[]>('/entities/mine').catch(() => [])).filter((item) => !service.has(item.slug));
  const drafts = owned.filter((item) => item.visibility === 'draft').length;

  return (
    <ListScreen
      title="мои предметы"
      list={
        <>
          {owned.length === 0 ? <p>Пока пусто.</p> : null}

          <ul>
            {owned.map((item) => (
              <li key={item.id} className="frame mb-2 flex flex-wrap items-center gap-2 p-2">
                <span className="flex-1">
                  {item.title}
                  <span className="hint">
                    {kindLabel(item.kind)}, {visibilityLabel(item.visibility)}
                    {item.inventorySlot === null ? '' : ', в инвентаре'}
                  </span>
                </span>

                <Link href={routes.entity(identity.handle, item.slug)} className="frame px-2">
                  открыть
                </Link>
                <Link href={routes.entityEdit(identity.handle, item.slug)} className="frame px-2">
                  править
                </Link>
              </li>
            ))}
          </ul>
        </>
      }
      info={
        <div>
          <p>
            <Link href={routes.create()} className="frame inline-block px-2 py-1">
              создать предмет
            </Link>
          </p>
          <p className="mt-2">Всего {owned.length}, из них черновиков {drafts}.</p>
        </div>
      }
      text={
        <div>
          <h2>как устроены предметы</h2>
          <p>Здесь всё ваше, включая черновики: больше их никто не видит.</p>
          <p>Контейнеры это ивент и капсула, внутрь них кладутся контент и товары.</p>
          <p>Предмет всегда создаётся к себе, а потом кладётся в нужный контейнер.</p>
          <Hint>«Править» ведёт в правку: там текст, медиа, вложенное и видимость.</Hint>
        </div>
      }
    />
  );
}
