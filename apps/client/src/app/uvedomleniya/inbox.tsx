'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { request } from '@/api/browser';
import { ZONE } from '@/api/time';
import type { NotificationItem, NotificationKind } from '@/api/types';
import { AsciiNote } from '@/components/world/ascii';
import { routes } from '@/routes';

const WORDING: Record<NotificationKind, (payload: Record<string, unknown>) => string> = {
  child_pending: (p) => `«${p.childTitle}» просят положить в «${p.parentTitle}», нужно ваше согласие`,
  child_added: (p) => `«${p.childTitle}» положили в «${p.parentTitle}»`,
  child_resolved: (p) => `Автор ${p.approved ? 'согласился' : 'отказал'}: «${p.childTitle}» в «${p.parentTitle}»`,
  application_submitted: (p) => `Новая заявка на «${p.eventTitle}»${p.withWork ? ', с работой' : ''}`,
  application_resolved: (p) => `Заявку на «${p.eventTitle}» ${p.accepted ? 'приняли' : 'отклонили'}`,
  collaborator_added: (p) => `Вас сделали соавтором «${p.title}»`,
  collaborator_removed: (p) => `Вас убрали из соавторов «${p.title}»`,
  feedback_received: (p) => (p.entityTitle ? `Отклик на «${p.entityTitle}»` : 'Отклик вашему профилю'),
};

const stamp = new Intl.DateTimeFormat('ru-RU', { timeZone: ZONE, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function Inbox({ initial }: { initial: NotificationItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function markRead(ids: string[] | null): Promise<void> {
    const answer = await request('/notifications/read', 'POST', { ids });

    if (!answer.ok) {
      setError(answer.error);
      return;
    }

    const now = new Date().toISOString();

    setItems((rows) => rows.map((row) => (!ids || ids.includes(row.id) ? { ...row, readAt: row.readAt ?? now } : row)));
    router.refresh();
  }

  const unread = items.filter((item) => !item.readAt).length;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span>Непрочитанных: {unread}.</span>
        {unread > 0 ? (
          <button type="button" onClick={() => void markRead(null)} className="frame px-2 py-1">
            отметить всё прочитанным
          </button>
        ) : null}
      </div>

      {error ? <AsciiNote kind={2}>ошибка: {error}</AsciiNote> : null}
      {items.length === 0 ? <AsciiNote>пока пусто</AsciiNote> : null}

      <ul>
        {items.map((item) => {
          const target = item.payload.target;

          return (
            <li key={item.id} className={`frame mb-2 p-2${item.readAt ? ' inbox-read' : ''}`}>
              <div>{WORDING[item.kind]?.(item.payload) ?? item.kind}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <small>{stamp.format(new Date(item.createdAt))}</small>
                {target ? (
                  <Link href={routes.entity(target.handle, target.slug)} className="underline">
                    открыть предмет
                  </Link>
                ) : null}
                {!item.readAt ? (
                  <button type="button" onClick={() => void markRead([item.id])} className="frame px-1">
                    прочитано
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
