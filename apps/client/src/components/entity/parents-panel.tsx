'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { request } from '@/api/browser';
import type { ParentPlace } from '@/api/types';
import { Modal } from '@/components/modal';
import { routes } from '@/routes';

const STATUS: Record<ParentPlace['status'], string> = {
  pending: 'ждёт вашего согласия',
  approved: 'лежит',
  declined: 'вы отказали',
};

// автор видит, куда его предмет положили, и решает по чужим контейнерам
export function ParentsPanel({ entityId }: { entityId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [places, setPlaces] = useState<ParentPlace[]>([]);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback(() => request<ParentPlace[]>(`/entities/${entityId}/parents`), [entityId]);

  useEffect(() => {
    let alive = true;

    void read().then((answer) => {
      if (alive) {
        setPlaces(answer.data ?? []);
      }
    });

    return () => {
      alive = false;
    };
  }, [read]);

  async function resolve(parentId: string, approve: boolean): Promise<void> {
    const answer = await request(`/entities/${parentId}/children/${entityId}/${approve ? 'approve' : 'decline'}`, 'POST');

    if (!answer.ok) {
      setError(answer.error);
      return;
    }

    setPlaces((await read()).data ?? []);
    router.refresh();
  }

  const waiting = places.filter((place) => place.status === 'pending').length;

  if (places.length === 0) {
    return null;
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="frame px-2 py-1">
        где лежит ({places.length}
        {waiting > 0 ? `, ждут ${waiting}` : ''})
      </button>

      <Modal title="где лежит этот предмет" open={open} onClose={() => setOpen(false)}>
        {error ? <p>Ошибка: {error}</p> : null}

        <ul>
          {places.map((place) => (
            <li key={place.parentId} className="frame mb-2 flex flex-wrap items-center gap-2 p-2">
              <span className="flex-1">
                <Link href={routes.entity(place.ownerHandle, place.slug)} className="underline">
                  {place.title}
                </Link>
                , @{place.ownerHandle}, {STATUS[place.status]}
              </span>

              {place.status === 'pending' && !place.mine ? (
                <>
                  <button type="button" onClick={() => void resolve(place.parentId, true)} className="frame px-2">
                    согласиться
                  </button>
                  <button type="button" onClick={() => void resolve(place.parentId, false)} className="frame px-2">
                    отказать
                  </button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
