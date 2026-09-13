'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { request } from '@/api/browser';
import type { ChildLink, EntityCard, EntityKind } from '@/api/types';
import { ConfirmButton } from '@/components/confirm-button';
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
  const [query, setQuery] = useState('');
  const inside = new Set(nested.map((item) => item.entity.id));

  const wanted = query.trim().toLowerCase();
  const free = candidates.filter(
    (card) =>
      !inside.has(card.id) &&
      card.id !== parentId &&
      (!wanted || `${card.title} ${card.tags.join(' ')}`.toLowerCase().includes(wanted)),
  );

  async function call(path: string, method: string, body?: unknown): Promise<void> {
    setBusy(true);
    setError(null);

    const answer = await request(path, method, body);

    setBusy(false);

    if (!answer.ok) {
      setError(answer.error);
      return;
    }

    router.refresh();
  }

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

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="frame px-2 py-1">
        что внутри ({nested.length})
      </button>

      <Modal title="что лежит внутри контейнера" open={open} onClose={() => setOpen(false)}>
        {error ? <p>Ошибка: {error}</p> : null}

        <p className="hint">Контейнер сам ничего не создаёт: сюда кладутся готовые предметы, снизу список того, что можно положить.</p>

        <strong className="mt-2 block">внутри</strong>
        <ul className="mt-2">
          {nested.map((item, index) => (
            <li key={item.entity.id} className="frame mb-2 flex flex-wrap items-center gap-2 p-2">
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
                    title="выше"
                    className="frame px-2"
                  >
                    &uarr;
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === nested.length - 1}
                    onClick={() => void move(index, 1)}
                    aria-label="ниже"
                    title="ниже"
                    className="frame px-2"
                  >
                    &darr;
                  </button>
                </>
              ) : null}

              <ConfirmButton
                label="убрать"
                title="убрать из контейнера"
                question={<p>«{item.entity.title}» пропадёт из этого контейнера. Сам предмет останется у автора.</p>}
                disabled={busy}
                onConfirm={() => call(`/entities/${parentId}/children/${item.entity.id}`, 'DELETE')}
              />

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

        {nested.length === 0 ? <p>Пусто.</p> : null}

        <strong className="mt-4 block">положить внутрь</strong>

        {candidates.length > 8 ? (
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="найти среди своих: название или тег"
            className="frame mt-1 block w-full p-1"
          />
        ) : null}

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
          <p>
            {wanted
              ? 'Ничего не нашлось.'
              : 'Класть нечего: все ваши предметы уже внутри, сначала создайте новый на странице создания.'}
          </p>
        ) : null}
      </Modal>
    </>
  );
}
