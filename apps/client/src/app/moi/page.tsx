import Link from 'next/link';
import { notFound } from 'next/navigation';

import { apiGet } from '@/api/client';
import { authHeaders } from '@/api/session';
import type { EntityCard } from '@/api/types';
import { requireService } from '@/api/viewer';
import { ListScreen } from '@/components/layout/list-screen';
import { MANIFEST_SLUG, SELECTION_SLUG, SHOWCASE_SLUG } from '@/platform';
import { Hint } from '@/components/ui/hint';
import { routes } from '@/routes';

interface Owned extends EntityCard {
  visibility: 'draft' | 'private' | 'unlisted' | 'public';
  inventorySlot: number | null;
}

const KIND: Record<string, string> = {
  event: 'ивент',
  capsule: 'капсула',
  content: 'контент',
  product: 'товар',
};

const VISIBILITY: Record<string, string> = {
  draft: 'черновик',
  private: 'только я',
  unlisted: 'по ссылке',
  public: 'публичный',
};

export default async function MinePage() {
  const identity = await requireService();

  if (!identity) {
    notFound();
  }

  const service = new Set([SELECTION_SLUG, SHOWCASE_SLUG, MANIFEST_SLUG]);
  const owned = (await apiGet<Owned[]>('/entities/mine', { headers: await authHeaders() }).catch(() => [])).filter(
    (item) => !service.has(item.slug),
  );

  const drafts = owned.filter((item) => item.visibility === 'draft').length;

  return (
    <ListScreen
      title="мои объекты"
      list={
        <>
          {owned.length === 0 ? <p>пока пусто</p> : null}

          <ul>
            {owned.map((item) => (
              <li key={item.id} className="frame mb-2 flex flex-wrap items-center gap-2 p-2">
                <span className="flex-1">
                  {item.title}
                  <span className="hint">
                    {KIND[item.kind] ?? item.kind}, {VISIBILITY[item.visibility] ?? item.visibility}
                    {item.inventorySlot === null ? '' : ', в инвентаре'}
                  </span>
                </span>

                <Link href={routes.entityEdit(identity.handle, item.slug)} className="frame px-2">
                  открыть
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
              создать объект
            </Link>
          </p>
          <p className="mt-2">всего {owned.length}, из них черновиков {drafts}</p>
        </div>
      }
      text={
        <div>
          <h2>как устроено хозяйство</h2>
          <p>Здесь всё ваше, включая черновики: больше их никто не видит.</p>
          <p>Контейнеры это ивент и капсула, внутрь них кладутся контент и товары.</p>
          <p>Объект всегда создаётся к себе, а потом кладётся в нужный контейнер.</p>
          <Hint>«открыть» ведёт в правку: там текст, медиа, вложенное и видимость</Hint>
        </div>
      }
    />
  );
}
