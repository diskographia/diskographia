'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { failureText } from '@/api/failure';
import { Modal } from '@/components/modal';
import { routes } from '@/routes';

interface Parent {
  parentId: string;
  title: string;
  slug: string;
  ownerHandle: string;
  mine: boolean;
  status: 'pending' | 'approved' | 'declined';
}

const STATUS: Record<Parent['status'], string> = {
  pending: 'ждёт вашего согласия',
  approved: 'лежит',
  declined: 'вы отказали',
};

// автор видит, куда его объект положили, и решает по чужим контейнерам
export function ParentsPanel({ entityId }: { entityId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [places, setPlaces] = useState<Parent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback(async (): Promise<Parent[]> => {
    const response = await fetch(`/api/entities/${entityId}/parents`);

    return response.ok ? ((await response.json()) as Parent[]) : [];
  }, [entityId]);

  useEffect(() => {
    let alive = true;

    void read().then((rows) => {
      if (alive) {
        setPlaces(rows);
      }
    });

    return () => {
      alive = false;
    };
  }, [read]);

  async function resolve(parentId: string, approve: boolean): Promise<void> {
    const response = await fetch(
      `/api/entities/${parentId}/children/${entityId}/${approve ? 'approve' : 'decline'}`,
      { method: 'POST' },
    );

    if (!response.ok) {
      setError(await failureText(response));
      return;
    }

    setPlaces(await read());
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

      <Modal title="где лежит этот объект" open={open} onClose={() => setOpen(false)}>
        {error ? <p>ошибка: {error}</p> : null}

        <ul>
          {places.map((place) => (
            <li key={place.parentId} className="frame mb-2 flex items-center gap-2 p-2">
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
