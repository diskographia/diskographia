'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { request } from '@/api/browser';
import { Modal } from '@/components/modal';
import { routes } from '@/routes';

interface DeleteButtonProps {
  entityId: string;
  title: string;
}

// удаление мягкое: предмет пропадает у всех, в чужих контейнерах остаётся след, вернуть можно из корзины
export function DeleteButton({ entityId, title }: DeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(): Promise<void> {
    setBusy(true);
    setError(null);

    const answer = await request(`/entities/${entityId}`, 'DELETE');

    if (!answer.ok) {
      setError(answer.error);
      setBusy(false);
      return;
    }

    router.push(routes.mine());
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="frame px-2 py-1">
        удалить
      </button>

      <Modal title="удалить предмет" open={open} onClose={() => setOpen(false)}>
        <p>«{title}» пропадёт из поиска, с главной и из вашего инвентаря.</p>
        <p>Там, где его положили другие, останется след «предмет удалён».</p>
        <p>Вернуть его можно из корзины.</p>

        {error ? <p>Ошибка: {error}</p> : null}

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
