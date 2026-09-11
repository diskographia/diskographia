import { notFound } from 'next/navigation';

import { apiGet } from '@/api/client';
import { authHeaders } from '@/api/session';
import type { NotificationItem } from '@/api/types';
import { requireService } from '@/api/viewer';
import { ListScreen } from '@/components/layout/list-screen';

import { Inbox } from './inbox';

export default async function InboxPage() {
  const viewer = await requireService();

  if (!viewer) {
    notFound();
  }

  const items = await apiGet<NotificationItem[]>('/notifications', { headers: await authHeaders() }).catch(() => []);

  return (
    <ListScreen
      title="уведомления"
      list={<Inbox initial={items} />}
      info={<p>всего: {items.length}</p>}
      text={
        <div>
          <h2>что сюда падает</h2>
          <p>Решения по заявкам, отклики, соавторство и то, куда положили ваши объекты.</p>
          <p>Что именно приходит, настраивается на странице настроек.</p>
        </div>
      }
    />
  );
}
