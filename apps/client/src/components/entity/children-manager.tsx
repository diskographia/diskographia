'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { ChildLink, EntityCard, EntityKind } from '@/api/types';
import { failureText } from '@/api/failure';
import { Modal } from '@/components/modal';

interface ChildrenManagerProps {
  parentId: string;
  parentKind: EntityKind;
  nested: ChildLink[];
  candidates: EntityCard[];
  canPin: boolean;
}

export function ChildrenManager({ parentId, parentKind, nested, candidates, canPin }: ChildrenManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inside = new Set(nested.map((item) => item.entity.id));

  async function move(index: number, shift: number): Promise<void> {
    const target = index + shift;

    if (target < 0 || target >= nested.length) {
      return;
    }

    const order = nested.map((item) => item.entity.id);
    [order[index], order[target]] = [order[target]!, order[index]!];

    await call(`/entities/${parentId}/children/order`, 'PUT', {
      order: order.map((childId, slotIndex) => ({ childId, slotIndex })),
    });
  }
  const free = candidates.filter((card) => !inside.has(card.id) && card.id !== parentId);

  async function call(path: string, method: string, body?: unknown): Promise<void> {
    setBusy(true);
    setError(null);

    const response = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      setError(await failureText(response));
    }

    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="frame px-2 py-1">
        что внутри ({nested.length})
      </button>

      <Modal title="что лежит внутри контейнера" open={open} onClose={() => setOpen(false)}>
        {error ? <p>ошибка: {error}</p> : null}

        <p className="hint">
          контейнер сам ничего не создаёт: сюда кладутся готовые объекты, снизу список того, что можно положить
        </p>

        <strong className="mt-2 block">внутри</strong>
        <ul className="mt-2">
          {nested.map((item, index) => (
            <li key={item.entity.id} className="frame mb-2 flex items-center gap-2 p-2">
              <span className="flex-1">
                {item.entity.title}
                {item.link.pinnedAt ? ' (закреплено)' : null}
              </span>

              {parentKind === 'capsule' ? (
                <>
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    onClick={() => void move(index, -1)}
                    aria-label="выше"
                    className="frame px-2"
                  >
                    &uarr;
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === nested.length - 1}
                    onClick={() => void move(index, 1)}
                    aria-label="ниже"
                    className="frame px-2"
                  >
                    &darr;
                  </button>
                </>
              ) : null}

              <button
                type="button"
                disabled={busy}
                onClick={() => void call(`/entities/${parentId}/children/${item.entity.id}`, 'DELETE')}
                className="frame px-2"
              >
                убрать
              </button>

              {canPin && parentKind === 'event' ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void call(
                      `/entities/${parentId}/children/${item.entity.id}/pin`,
                      item.link.pinnedAt ? 'DELETE' : 'POST',
                    )
                  }
                  className="frame px-2"
                >
                  {item.link.pinnedAt ? 'открепить' : 'закрепить'}
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {nested.length === 0 ? <p>пусто</p> : null}

        <strong className="mt-4 block">положить внутрь</strong>
        <ul className="mt-2">
          {free.map((card) => (
            <li key={card.id} className="frame mb-2 flex items-center gap-2 p-2">
              <span className="flex-1">{card.title}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void call(`/entities/${parentId}/children`, 'POST', { childId: card.id })}
                className="frame px-2"
              >
                положить
              </button>
            </li>
          ))}
        </ul>

        {free.length === 0 ? (
          <p>класть нечего: все ваши объекты уже внутри, сначала создайте новый на странице создания</p>
        ) : null}
      </Modal>
    </>
  );
}
