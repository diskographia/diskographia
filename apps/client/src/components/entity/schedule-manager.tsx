'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { ScheduleEntry } from '@/api/types';
import { failureText } from '@/api/failure';
import { Modal } from '@/components/modal';

const dayLabel = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function ScheduleManager({ eventId, entries }: { eventId: string; entries: ScheduleEntry[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(form: FormData): Promise<void> {
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/feed/events/${eventId}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startsAt: new Date(String(form.get('startsAt'))).toISOString(),
        endsAt: form.get('endsAt') ? new Date(String(form.get('endsAt'))).toISOString() : null,
        title: String(form.get('title')),
        shortMd: String(form.get('shortMd') ?? ''),
        fullMd: String(form.get('fullMd') ?? ''),
      }),
    });

    if (!response.ok) {
      setError(await failureText(response));
    }

    setBusy(false);
    router.refresh();
  }

  async function remove(entryId: string): Promise<void> {
    const response = await fetch(`/api/feed/schedule/${entryId}`, { method: 'DELETE' });

    if (!response.ok) {
      setError(await failureText(response));
      return;
    }

    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="frame px-2 py-1">
        расписание ({entries.length})
      </button>

      <Modal title="расписание ивента" open={open} onClose={() => setOpen(false)} half>
        {error ? <p>ошибка: {error}</p> : null}

        <ul>
          {entries.map((entry) => (
            <li key={entry.id} className="frame mb-2 flex items-center gap-2 p-2">
              <span className="flex-1">
                {dayLabel.format(new Date(entry.startsAt))} {entry.title}
              </span>
              <button type="button" onClick={() => void remove(entry.id)} className="frame px-2">
                убрать
              </button>
            </li>
          ))}
        </ul>

        {entries.length === 0 ? <p>записей нет</p> : null}

        <form action={add} className="frame mt-3 p-2">
          <input type="datetime-local" name="startsAt" required className="frame mb-1 block w-full p-1" />
          <input type="datetime-local" name="endsAt" className="frame mb-1 block w-full p-1" />
          <input name="title" placeholder="заголовок" required className="frame mb-1 block w-full p-1" />
          <input name="shortMd" placeholder="кратко, показывается при наведении" className="frame mb-1 block w-full p-1" />
          <textarea name="fullMd" placeholder="подробно, markdown" rows={4} className="frame mb-1 block w-full p-1" />
          <button type="submit" disabled={busy} className="frame px-2 py-1">
            добавить
          </button>
        </form>
      </Modal>
    </>
  );
}
