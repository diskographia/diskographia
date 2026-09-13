'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

import { request } from '@/api/browser';
import { previewUrl } from '@/api/urls';
import type { MediaItem, MediaKind } from '@/api/types';
import { ConfirmButton } from '@/components/confirm-button';
import { Modal } from '@/components/modal';

import { progressLabel, useUploadQueue } from './upload-queue';

const KIND: Record<MediaKind, string> = {
  image: 'картинка',
  audio: 'звук',
  video: 'видео',
  model: 'сцена',
  embed: 'трансляция',
  file: 'файл',
};

// обложка живёт отдельно от очередей: она показывается карточкой в ленте, а в экране показа не крутится
const GROUPS: { key: string; title: string; note: string; kinds: MediaKind[] }[] = [
  {
    key: 'first',
    title: 'первая очередь',
    note: 'Трансляции и видео. Пока здесь что-то есть, показывается только это.',
    kinds: ['embed', 'video'],
  },
  {
    key: 'second',
    title: 'вторая очередь',
    note: 'Фото. Листаются по кругу вместе с вложенными предметами.',
    kinds: ['image'],
  },
  {
    key: 'aside',
    title: 'вне очереди',
    note: 'Звук идёт в плеер в этом порядке. Сцены и файлы лежат на полке материалов.',
    kinds: ['audio', 'model', 'file'],
  },
];

interface MediaManagerProps {
  entityId: string;
  media: MediaItem[];
  label?: string;
}

function clock(ms: number): string {
  const total = Math.round(ms / 1000);

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// одно место для медиа предмета: загрузка, ссылки, обложка, очереди, подписи, порядок мышью
export function MediaManager({ entityId, media, label }: MediaManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const depth = useRef(0);
  const [dropping, setDropping] = useState(false);
  const refresh = useCallback(() => router.refresh(), [router]);
  const queue = useUploadQueue(entityId, refresh);

  const cover = media.find((item) => item.media.kind === 'image' && item.file) ?? null;
  const rest = media.filter((item) => item !== cover);

  async function send(path: string, method: string, body?: unknown): Promise<boolean> {
    setError(null);

    const answer = await request(path, method, body);

    if (!answer.ok) {
      setError(answer.error);
      return false;
    }

    router.refresh();
    return true;
  }

  async function addLink(): Promise<void> {
    const url = link.trim();

    if (!url) {
      return;
    }

    if (await send(`/entities/${entityId}/media/embed`, 'POST', { url })) {
      setLink('');
    }
  }

  // сервер принимает только полную перестановку, поэтому список собирается целиком
  async function reorder(ids: string[]): Promise<void> {
    await send(`/entities/${entityId}/media/order`, 'PATCH', { ids });
  }

  // перенос плитки на место другой в той же группе
  async function place(movedId: string, targetId: string): Promise<void> {
    if (movedId === targetId) {
      return;
    }

    const ids = media.map((item) => item.media.id);
    const from = ids.indexOf(movedId);
    const to = ids.indexOf(targetId);

    if (from < 0 || to < 0) {
      return;
    }

    ids.splice(from, 1);
    ids.splice(to, 0, movedId);

    await reorder(ids);
  }

  // стрелки двигают внутри своей группы, чтобы шаг был виден
  async function step(item: MediaItem, direction: -1 | 1): Promise<void> {
    const group = GROUPS.find((candidate) => candidate.kinds.includes(item.media.kind));
    const fellows = rest.filter((candidate) => group?.kinds.includes(candidate.media.kind));
    const at = fellows.indexOf(item);
    const neighbour = fellows[at + direction];

    if (neighbour) {
      await place(item.media.id, neighbour.media.id);
    }
  }

  async function makeCover(item: MediaItem): Promise<void> {
    await reorder([item.media.id, ...media.map((candidate) => candidate.media.id).filter((id) => id !== item.media.id)]);
  }

  async function rename(item: MediaItem, title: string): Promise<void> {
    if ((item.media.title ?? '') !== title.trim()) {
      await send(`/media/${item.media.id}`, 'PATCH', { title });
    }
  }

  function tile(item: MediaItem, extra?: React.ReactNode) {
    const preview = item.file && item.media.kind === 'image' ? previewUrl(item.file.path) : null;

    return (
      <li
        key={item.media.id}
        className={`media-tile${dragging === item.media.id ? ' dragging' : ''}${over === item.media.id ? ' over' : ''}`}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', item.media.id);
          setDragging(item.media.id);
        }}
        onDragEnd={() => {
          setDragging(null);
          setOver(null);
        }}
        onDragOver={(event) => {
          if (dragging) {
            event.preventDefault();
            event.stopPropagation();
            setOver(item.media.id);
          }
        }}
        onDragLeave={() => setOver(null)}
        onDrop={(event) => {
          if (dragging) {
            event.preventDefault();
            event.stopPropagation();
            void place(dragging, item.media.id);
            setDragging(null);
            setOver(null);
          }
        }}
      >
        <div className="media-shot">
          {preview ? (
            <img src={preview} alt="" loading="lazy" />
          ) : (
            <span className="media-kind">
              {KIND[item.media.kind]}
              {item.file?.durationMs ? <small>{clock(item.file.durationMs)}</small> : null}
            </span>
          )}
        </div>

        <input
          defaultValue={item.media.title ?? ''}
          onBlur={(event) => void rename(item, event.target.value)}
          placeholder={item.media.kind === 'audio' ? 'название в плеере' : 'подпись'}
          aria-label="подпись"
          className="frame block w-full p-1"
        />

        <span className="hint truncate">
          {item.file ? `${Math.round(item.file.sizeBytes / 1024)} КБ` : item.media.embedUrl}
        </span>

        <span className="flex flex-wrap gap-1">
          {extra}
          <button type="button" onClick={() => void step(item, -1)} title="раньше" aria-label="раньше" className="frame px-2">
            &#8593;
          </button>
          <button type="button" onClick={() => void step(item, 1)} title="позже" aria-label="позже" className="frame px-2">
            &#8595;
          </button>
          <ConfirmButton
            label="×"
            title="убрать медиа"
            question={<p>«{item.media.title || KIND[item.media.kind]}» будет убрано из предмета. Файл останется на диске.</p>}
            onConfirm={async () => {
              await send(`/media/${item.media.id}`, 'DELETE');
            }}
          />
        </span>
      </li>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="frame px-2 py-1">
        {label ?? 'медиа'} ({media.length})
      </button>

      <Modal title="медиа предмета" open={open} onClose={() => setOpen(false)} half>
        <div
          className={`media-board${dropping ? ' dropping' : ''}`}
          onDragEnter={(event) => {
            if (!dragging) {
              event.preventDefault();
              depth.current += 1;
              setDropping(true);
            }
          }}
          onDragOver={(event) => {
            if (!dragging) {
              event.preventDefault();
            }
          }}
          onDragLeave={() => {
            depth.current = Math.max(0, depth.current - 1);

            if (depth.current === 0) {
              setDropping(false);
            }
          }}
          onDrop={(event) => {
            if (!dragging) {
              event.preventDefault();
              depth.current = 0;
              setDropping(false);
              void queue.upload(event.dataTransfer.files);
            }
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <label className="frame cursor-pointer px-2 py-1">
              + файлы
              <input
                type="file"
                multiple
                hidden
                onChange={(event) => {
                  void queue.upload(event.target.files);
                  event.target.value = '';
                }}
              />
            </label>
            <span className="hint">или перетащите файлы сюда</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={link}
              onChange={(event) => setLink(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void addLink();
                }
              }}
              placeholder="ссылка на трансляцию: youtube или twitch"
              aria-label="ссылка на трансляцию"
              className="frame min-w-0 flex-1 p-1"
            />
            <button type="button" onClick={() => void addLink()} className="frame px-2 py-1">
              добавить
            </button>
          </div>

          {queue.progress ? (
            <p className="mt-1">
              Грузится {progressLabel(queue.progress)}{' '}
              <button type="button" onClick={queue.cancel} className="frame px-1">
                отменить
              </button>
            </p>
          ) : null}
          {queue.error ? <p className="mt-1">Ошибка: {queue.error}</p> : null}
          {error ? <p className="mt-1">Ошибка: {error}</p> : null}
          {dropping ? <p className="mt-1">Отпустите файлы.</p> : null}

          <section className="mt-3">
            <strong>обложка</strong>
            <p className="hint">Показывается в ленте и сетках. В очередях не участвует.</p>
            {cover ? (
              <ul className="media-grid mt-1">{tile(cover)}</ul>
            ) : (
              <p className="mt-1">Загрузите картинку, первая станет обложкой.</p>
            )}
          </section>

          {GROUPS.map((group) => {
            const rows = rest.filter((item) => group.kinds.includes(item.media.kind));

            return (
              <section key={group.key} className="mt-3">
                <strong>{group.title}</strong>
                <p className="hint">{group.note}</p>

                {rows.length === 0 ? <p className="mt-1">Пусто.</p> : null}

                <ul className="media-grid mt-1">
                  {rows.map((item) =>
                    tile(
                      item,
                      item.media.kind === 'image' ? (
                        <button type="button" onClick={() => void makeCover(item)} className="frame px-2" title="сделать обложкой">
                          обложка
                        </button>
                      ) : undefined,
                    ),
                  )}
                </ul>
              </section>
            );
          })}

          <p className="hint mt-3">
            Порядок меняется перетаскиванием или стрелками. Вложенные предметы попадают во вторую очередь автоматически.
          </p>
        </div>
      </Modal>
    </>
  );
}
