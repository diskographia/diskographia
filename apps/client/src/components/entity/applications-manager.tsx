'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { request } from '@/api/browser';
import type { EventApplication } from '@/api/types';
import { Modal } from '@/components/modal';

const STATUS: Record<EventApplication['status'], string> = {
  pending: 'ждёт',
  accepted: 'принята',
  declined: 'отклонена',
};

export function ApplicationsManager({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<EventApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback(() => request<EventApplication[]>(`/events/${eventId}/applications`), [eventId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let alive = true;

    void read().then((answer) => {
      if (alive) {
        setItems(answer.data ?? []);
        setError(answer.error);
      }
    });

    return () => {
      alive = false;
    };
  }, [open, read]);

  async function resolve(profileId: string, accept: boolean, withWork: boolean): Promise<void> {
    const answer = await request(`/events/${eventId}/applications/${profileId}/resolve`, 'POST', { accept, withWork });

    if (!answer.ok) {
      setError(answer.error);
      return;
    }

    const fresh = await read();

    setItems(fresh.data ?? []);
    setError(fresh.error);
    router.refresh();
  }

  const pending = items?.filter((item) => item.status === 'pending') ?? [];

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setItems(null);
          setOpen(true);
        }}
        className="frame px-2 py-1"
      >
        заявки
      </button>

      <Modal title="заявки на участие" open={open} onClose={() => setOpen(false)} half>
        {error ? <p>Ошибка: {error}</p> : null}
        {items === null && !error ? <p>Загружается.</p> : null}
        {items !== null && items.length === 0 ? <p>Заявок нет.</p> : null}

        <ul>
          {(items ?? []).map((item) => (
            <li key={item.profileId} className="frame mb-2 p-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1">
                  @{item.handle} {STATUS[item.status]}
                  {item.attachedEntityId ? ', с работой' : ''}
                </span>

                {item.status === 'pending' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void resolve(item.profileId, true, !!item.attachedEntityId)}
                      className="frame px-2"
                    >
                      принять{item.attachedEntityId ? ' с работой' : ''}
                    </button>

                    {item.attachedEntityId ? (
                      <button type="button" onClick={() => void resolve(item.profileId, true, false)} className="frame px-2">
                        принять без работы
                      </button>
                    ) : null}

                    <button type="button" onClick={() => void resolve(item.profileId, false, false)} className="frame px-2">
                      отклонить
                    </button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        {pending.length > 0 ? <p>Нерассмотренных: {pending.length}</p> : null}
      </Modal>
    </>
  );
}
