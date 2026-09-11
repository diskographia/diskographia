'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { failureText } from '@/api/failure';
import { Modal } from '@/components/modal';
import { routes } from '@/routes';

interface DeleteButtonProps {
  entityId: string;
  title: string;
  handle: string;
}

// удаление мягкое: объект пропадает у всех, в чужих контейнерах остаётся след
export function DeleteButton({ entityId, title, handle }: DeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(): Promise<void> {
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/entities/${entityId}`, { method: 'DELETE' });

    if (!response.ok) {
      setError(await failureText(response));
      setBusy(false);
      return;
    }

    router.push(routes.profile(handle));
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="frame px-2 py-1">
        удалить
      </button>

      <Modal title="удалить объект" open={open} onClose={() => setOpen(false)}>
        <p>«{title}» пропадёт из поиска, с главной и из вашего инвентаря.</p>
        <p>Там, где его положили другие, останется след «объект удалён».</p>
        <p>Из интерфейса это не откатывается: вернуть можно только правкой базы.</p>

        {error ? <p>ошибка: {error}</p> : null}

        <div className="mt-3 flex gap-1">
          <button type="button" onClick={() => void remove()} disabled={busy} className="frame px-2 py-1">
            {busy ? 'удаляем' : 'да, удалить'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="frame px-2 py-1">
            отмена
          </button>
        </div>
      </Modal>
    </>
  );
}
