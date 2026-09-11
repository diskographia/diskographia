'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { failureText } from '@/api/failure';
import { Modal } from '@/components/modal';

interface Application {
  profileId: string;
  handle: string;
  status: 'pending' | 'accepted' | 'declined';
  attachedEntityId: string | null;
  attending: boolean;
  createdAt: string;
}

const STATUS: Record<Application['status'], string> = {
  pending: 'ждёт',
  accepted: 'принята',
  declined: 'отклонена',
};

export function ApplicationsManager({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback(async (): Promise<{ items: Application[]; error: string | null }> => {
    const response = await fetch(`/api/events/${eventId}/applications`);

    return response.ok
      ? { items: (await response.json()) as Application[], error: null }
      : { items: [], error: await failureText(response) };
  }, [eventId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let alive = true;

    void read().then((result) => {
      if (alive) {
        setItems(result.items);
        setError(result.error);
      }
    });

    return () => {
      alive = false;
    };
  }, [open, read]);

  async function resolve(profileId: string, accept: boolean, withWork: boolean): Promise<void> {
    const response = await fetch(`/api/events/${eventId}/applications/${profileId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept, withWork }),
    });

    if (!response.ok) {
      setError(await failureText(response));
      return;
    }

    const result = await read();

    setItems(result.items);
    setError(result.error);
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
        {error ? <p>ошибка: {error}</p> : null}
        {items === null && !error ? <p>загружается</p> : null}
        {items !== null && items.length === 0 ? <p>заявок нет</p> : null}

        <ul>
          {(items ?? []).map((item) => (
            <li key={item.profileId} className="frame mb-2 p-2">
              <div className="flex items-center gap-2">
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

        {pending.length > 0 ? <p>нерассмотренных: {pending.length}</p> : null}
      </Modal>
    </>
  );
}
