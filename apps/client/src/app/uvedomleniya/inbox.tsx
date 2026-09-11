'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { failureText } from '@/api/failure';
import type { NotificationItem, NotificationKind } from '@/api/types';
import { AsciiNote } from '@/components/world/ascii';

const WORDING: Record<NotificationKind, (payload: Record<string, unknown>) => string> = {
  child_pending: (p) => `«${p.childTitle}» просят положить в «${p.parentTitle}», нужно ваше согласие`,
  child_added: (p) => `«${p.childTitle}» положили в «${p.parentTitle}»`,
  child_resolved: (p) => `автор ${p.approved ? 'согласился' : 'отказал'}: «${p.childTitle}» в «${p.parentTitle}»`,
  application_submitted: (p) => `новая заявка на «${p.eventTitle}»${p.withWork ? ', с работой' : ''}`,
  application_resolved: (p) => `заявку на «${p.eventTitle}» ${p.accepted ? 'приняли' : 'отклонили'}`,
  collaborator_added: (p) => `вас сделали соавтором «${p.title}»`,
  collaborator_removed: (p) => `вас убрали из соавторов «${p.title}»`,
  feedback_received: (p) => (p.entityTitle ? `отклик на «${p.entityTitle}»` : 'отклик вашему профилю'),
};

const stamp = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function Inbox({ initial }: { initial: NotificationItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function readAll(): Promise<void> {
    const response = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: null }),
    });

    if (!response.ok) {
      setError(await failureText(response));
      return;
    }

    setItems((rows) => rows.map((row) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() })));
    router.refresh();
  }

  const unread = items.filter((item) => !item.readAt).length;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span>непрочитанных: {unread}</span>
        {unread > 0 ? (
          <button type="button" onClick={() => void readAll()} className="frame px-2 py-1">
            отметить всё прочитанным
          </button>
        ) : null}
      </div>

      {error ? <AsciiNote kind={2}>ошибка: {error}</AsciiNote> : null}
      {items.length === 0 ? <AsciiNote>пока пусто</AsciiNote> : null}

      <ul>
        {items.map((item) => (
          <li key={item.id} className="frame mb-2 p-2" style={item.readAt ? { opacity: 0.6 } : undefined}>
            <div>{WORDING[item.kind]?.(item.payload) ?? item.kind}</div>
            <small>{stamp.format(new Date(item.createdAt))}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
