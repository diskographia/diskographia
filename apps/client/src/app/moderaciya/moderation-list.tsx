'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { request } from '@/api/browser';
import type { ModerationRow } from '@/api/types';
import { ConfirmButton } from '@/components/confirm-button';
import { kindLabel, visibilityLabel } from '@/components/entity/labels';
import { routes } from '@/routes';

export function ModerationList({ rows, showDeleted }: { rows: ModerationRow[]; showDeleted: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: 'hide' | 'delete' | 'restore'): Promise<void> {
    setBusy(id);
    setError(null);

    const answer = await request(`/admin/objects/${id}/${action}`, 'POST');

    setBusy(null);

    if (!answer.ok) {
      setError(answer.error);
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <div className="mb-2 flex gap-1">
        <Link href={routes.moderation()} aria-current={!showDeleted ? 'true' : undefined} className="frame px-2 py-1">
          живые
        </Link>
        <Link href={`${routes.moderation()}?deleted=true`} aria-current={showDeleted ? 'true' : undefined} className="frame px-2 py-1">
          удалённые
        </Link>
      </div>

      {error ? <p>Ошибка: {error}</p> : null}
      {rows.length === 0 ? <p>Пусто.</p> : null}

      <ul>
        {rows.map((row) => (
          <li key={row.id} className="frame mb-2 flex flex-wrap items-center gap-2 p-2">
            <span className="flex-1">
              <Link href={routes.entity(row.ownerHandle, row.slug)} className="underline">
                {row.title}
              </Link>
              <span className="hint">
                {kindLabel(row.kind)}, {visibilityLabel(row.visibility)}, владелец @{row.ownerHandle}
                {row.authorHandle === row.ownerHandle ? '' : `, автор @${row.authorHandle}`}, откликов {row.feedbackCount}
              </span>
            </span>

            {showDeleted ? (
              <button
                type="button"
                disabled={busy === row.id}
                onClick={() => void act(row.id, 'restore')}
                className="frame px-2"
              >
                вернуть
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy === row.id || row.visibility === 'private'}
                  onClick={() => void act(row.id, 'hide')}
                  className="frame px-2"
                >
                  спрятать
                </button>
                <ConfirmButton
                  label="удалить"
                  title="удалить чужой предмет"
                  question={<p>«{row.title}» @{row.ownerHandle} погаснет у всех и ляжет в удалённое. Вернуть можно здесь же.</p>}
                  disabled={busy === row.id}
                  onConfirm={() => act(row.id, 'delete')}
                />
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
