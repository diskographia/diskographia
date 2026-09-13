'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { request } from '@/api/browser';
import type { ScheduleEntry } from '@/api/types';
import { ConfirmButton } from '@/components/confirm-button';
import { Modal } from '@/components/modal';

const dayLabel = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function isoOrNull(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  const moment = new Date(text);

  return text && !Number.isNaN(moment.getTime()) ? moment.toISOString() : null;
}

export function ScheduleManager({ eventId, entries }: { eventId: string; entries: ScheduleEntry[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(form: FormData): Promise<void> {
    setBusy(true);
    setError(null);

    const answer = await request(`/feed/events/${eventId}/schedule`, 'POST', {
      startsAt: isoOrNull(form.get('startsAt')) ?? '',
      endsAt: isoOrNull(form.get('endsAt')),
      title: String(form.get('title') ?? '').trim(),
      shortMd: String(form.get('shortMd') ?? ''),
      fullMd: String(form.get('fullMd') ?? ''),
    });

    setBusy(false);

    if (!answer.ok) {
      setError(answer.error);
      return;
    }

    router.refresh();
  }

  async function remove(entryId: string): Promise<void> {
    const answer = await request(`/feed/schedule/${entryId}`, 'DELETE');

    if (!answer.ok) {
      setError(answer.error);
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
        {error ? <p>Ошибка: {error}</p> : null}

        <ul>
          {entries.map((entry) => (
            <li key={entry.id} className="frame mb-2 flex items-center gap-2 p-2">
              <span className="flex-1">
                {dayLabel.format(new Date(entry.startsAt))} {entry.title}
              </span>
              <ConfirmButton
                label="убрать"
                title="убрать запись"
                question={<p>Запись «{entry.title}» исчезнет из расписания.</p>}
                onConfirm={() => remove(entry.id)}
              />
            </li>
          ))}
        </ul>

        {entries.length === 0 ? <p>Записей нет.</p> : null}

        <form action={add} className="frame mt-3 p-2">
          <label className="block">
            начало
            <input type="datetime-local" name="startsAt" required className="frame mb-1 block w-full p-1" />
          </label>
          <label className="block">
            конец, можно пусто
            <input type="datetime-local" name="endsAt" className="frame mb-1 block w-full p-1" />
          </label>
          <label className="block">
            заголовок
            <input name="title" required className="frame mb-1 block w-full p-1" />
          </label>
          <label className="block">
            кратко, показывается на плитке дня
            <input name="shortMd" className="frame mb-1 block w-full p-1" />
          </label>
          <label className="block">
            подробно, markdown
            <textarea name="fullMd" rows={4} className="frame mb-1 block w-full p-1" />
          </label>
          <button type="submit" disabled={busy} className="frame px-2 py-1">
            добавить
          </button>
        </form>
      </Modal>
    </>
  );
}
