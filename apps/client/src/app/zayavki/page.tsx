import Link from 'next/link';
import { notFound } from 'next/navigation';

import { apiGet } from '@/api/client';
import { authHeaders } from '@/api/session';
import { requireService } from '@/api/viewer';
import { ListScreen } from '@/components/layout/list-screen';
import { routes } from '@/routes';

interface Application {
  eventId: string;
  title: string;
  slug: string;
  ownerHandle: string;
  status: 'pending' | 'accepted' | 'declined';
  attachedEntityId: string | null;
  createdAt: string;
}

const STATUS: Record<Application['status'], string> = {
  pending: 'ждёт решения',
  accepted: 'приняли',
  declined: 'отклонили',
};

const stamp = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default async function ApplicationsPage() {
  const viewer = await requireService();

  if (!viewer) {
    notFound();
  }

  const items = await apiGet<Application[]>('/events/applications/mine', { headers: await authHeaders() }).catch(
    () => [],
  );

  const waiting = items.filter((item) => item.status === 'pending').length;

  return (
    <ListScreen
      title="мои заявки"
      list={
        <>
          {items.length === 0 ? <p>вы никуда не подавались</p> : null}

          <ul>
            {items.map((item) => (
              <li key={item.eventId} className="frame mb-2 flex flex-wrap items-center gap-2 p-2">
                <span className="flex-1">
                  <Link href={routes.entity(item.ownerHandle, item.slug)} className="underline">
                    {item.title}
                  </Link>
                  <span className="hint">
                    {STATUS[item.status]}
                    {item.attachedEntityId ? ', с работой' : ''}, подана {stamp.format(new Date(item.createdAt))}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      }
      info={
        <div>
          <p>всего заявок: {items.length}</p>
          <p>ждут решения: {waiting}</p>
        </div>
      }
      text={
        <div>
          <h2>как идёт заявка</h2>
          <p>Заявку рассматривает организатор ивента, решение придёт уведомлением.</p>
          <p>Принятая заявка даёт право класть свои работы внутрь ивента.</p>
        </div>
      }
    />
  );
}
