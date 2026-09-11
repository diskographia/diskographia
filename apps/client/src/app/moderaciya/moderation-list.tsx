'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { failureText } from '@/api/failure';
import { routes } from '@/routes';

export interface Row {
  id: string;
  kind: string;
  title: string;
  slug: string;
  visibility: string;
  feedback_count: number;
  deleted_at: string | null;
  owner_handle: string;
  author_handle: string;
}

const KIND: Record<string, string> = {
  event: 'ивент',
  capsule: 'капсула',
  content: 'контент',
  product: 'товар',
};

const VISIBILITY: Record<string, string> = {
  draft: 'черновик',
  private: 'только автор',
  unlisted: 'по ссылке',
  public: 'публичный',
};

export function ModerationList({ rows, showDeleted }: { rows: Row[]; showDeleted: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: 'hide' | 'delete' | 'restore'): Promise<void> {
    setBusy(id);
    setError(null);

    const response = await fetch(`/api/admin/objects/${id}/${action}`, { method: 'POST' });

    if (!response.ok) {
      setError(await failureText(response));
    }

    setBusy(null);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-2 flex gap-1">
        <Link href={routes.moderation()} aria-pressed={!showDeleted} className="frame px-2 py-1">
          живые
        </Link>
        <Link href={`${routes.moderation()}?deleted=true`} aria-pressed={showDeleted} className="frame px-2 py-1">
          удалённые
        </Link>
      </div>

      {error ? <p>ошибка: {error}</p> : null}
      {rows.length === 0 ? <p>пусто</p> : null}

      <ul>
        {rows.map((row) => (
          <li key={row.id} className="frame mb-2 flex flex-wrap items-center gap-2 p-2">
            <span className="flex-1">
              <Link href={routes.entity(row.owner_handle, row.slug)} className="underline">
                {row.title}
              </Link>
              <span className="hint">
                {KIND[row.kind] ?? row.kind}, {VISIBILITY[row.visibility] ?? row.visibility}, владелец @
                {row.owner_handle}
                {row.author_handle === row.owner_handle ? '' : `, автор @${row.author_handle}`}, откликов{' '}
                {row.feedback_count}
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
                <button
                  type="button"
                  disabled={busy === row.id}
                  onClick={() => void act(row.id, 'delete')}
                  className="frame px-2"
                >
                  удалить
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
