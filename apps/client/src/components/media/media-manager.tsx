'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

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

// две очереди правого экрана: сверху трансляции и видео, под ними фото
const QUEUES: { title: string; note: string; kinds: MediaKind[] }[] = [
  {
    title: 'первая очередь: трансляции и видео',
    note: 'Показывается вместо всего остального и сама не листается.',
    kinds: ['embed', 'video'],
  },
  {
    title: 'вторая очередь: фото',
    note: 'Крутится по кругу вместе с вложенными предметами, пока первой очереди нет. Первое фото это обложка.',
    kinds: ['image'],
  },
  {
    title: 'вне очереди',
    note: 'Звук уходит в плеер, сцена и файлы открываются с полки материалов.',
    kinds: ['audio', 'model', 'file'],
  },
];

interface MediaManagerProps {
  entityId: string;
  media: MediaItem[];
  label?: string;
}

export function MediaManager({ entityId, media, label }: MediaManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stream, setStream] = useState('');
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => router.refresh(), [router]);
  const queue = useUploadQueue(entityId, refresh);

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

  async function addStream(): Promise<void> {
    const url = stream.trim();

    if (!url) {
      return;
    }

    if (await send(`/entities/${entityId}/media/embed`, 'POST', { url })) {
      setStream('');
    }
  }

  // порядок задаётся списком целиком: сервер принимает только полную перестановку.
  // стрелки двигают в пределах своей очереди, чтобы шаг всегда был виден
  async function move(mediaId: string, step: number): Promise<void> {
    const ids = media.map((item) => item.media.id);
    const from = ids.indexOf(mediaId);
    const kinds = QUEUES.find((group) => group.kinds.includes(media[from]!.media.kind))?.kinds ?? [];
    const fellow = media.map((item, index) => ({ item, index })).filter(({ item }) => kinds.includes(item.media.kind));
    const place = fellow.findIndex(({ index }) => index === from);
    const neighbour = fellow[place + step];

    if (from < 0 || !neighbour) {
      return;
    }

    [ids[from], ids[neighbour.index]] = [ids[neighbour.index]!, ids[from]!];

    await send(`/entities/${entityId}/media/order`, 'PATCH', { ids });
  }

  // обложка это первая картинка по порядку
  async function makeCover(mediaId: string): Promise<void> {
    const ids = media.map((item) => item.media.id).filter((id) => id !== mediaId);

    await send(`/entities/${entityId}/media/order`, 'PATCH', { ids: [mediaId, ...ids] });
  }

  async function rename(item: MediaItem, title: string): Promise<void> {
    if ((item.media.title ?? '') === title.trim()) {
      return;
    }

    await send(`/media/${item.media.id}`, 'PATCH', { title });
  }

  const firstImage = media.find((item) => item.media.kind === 'image')?.media.id ?? null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="frame px-2 py-1">
        {label ?? 'медиа'} ({media.length})
      </button>

      <Modal title="медиа и очереди предмета" open={open} onClose={() => setOpen(false)}>
        <label className="block">
          загрузить файлы
          <input
            type="file"
            multiple
            className="block"
            onChange={(event) => {
              void queue.upload(event.target.files);
              event.target.value = '';
            }}
          />
        </label>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={stream}
            onChange={(event) => setStream(event.target.value)}
            placeholder="ссылка на трансляцию: youtube или twitch"
            aria-label="ссылка на трансляцию"
            className="frame flex-1 p-1"
          />
          <button type="button" onClick={() => void addStream()} className="frame px-2 py-1">
            в первую очередь
          </button>
        </div>

        {queue.progress ? (
          <p className="mt-1">
            Загружается {progressLabel(queue.progress)}{' '}
            <button type="button" onClick={queue.cancel} className="frame px-1">
              отменить
            </button>
          </p>
        ) : null}

        {queue.error ? <p className="mt-1">Ошибка: {queue.error}</p> : null}
        {error ? <p className="mt-1">Ошибка: {error}</p> : null}

        {QUEUES.map((group) => {
          const rows = media.filter((item) => group.kinds.includes(item.media.kind));

          return (
            <section key={group.title} className="mt-3">
              <strong>{group.title}</strong>
              <p className="hint">{group.note}</p>

              {rows.length === 0 ? <p className="mt-1">Пусто.</p> : null}

              <ul className="mt-1">
                {rows.map((item, place) => (
                  <li key={item.media.id} className="frame mb-2 flex flex-wrap items-center gap-2 p-2">
                    {item.file && item.media.kind === 'image' ? (
                      <img src={previewUrl(item.file.path) ?? ''} alt="" loading="lazy" className="h-16 w-16 object-cover" />
                    ) : (
                      <span className="placeholder inline-block h-16 w-16" />
                    )}

                    <span className="min-w-40 flex-1">
                      <input
                        defaultValue={item.media.title ?? ''}
                        onBlur={(event) => void rename(item, event.target.value)}
                        placeholder="название"
                        aria-label="название"
                        className="frame block w-full p-1"
                      />
                      <span className="hint">
                        {KIND[item.media.kind]}
                        {item.file ? `, ${Math.round(item.file.sizeBytes / 1024)} КБ` : ''}
                        {item.media.embedUrl ? `, ${item.media.embedUrl}` : ''}
                        {item.media.id === firstImage ? ', обложка' : ''}
                      </span>
                    </span>

                    <button
                      type="button"
                      disabled={place === 0}
                      onClick={() => void move(item.media.id, -1)}
                      title="выше в очереди"
                      aria-label="выше в очереди"
                      className="frame px-2"
                    >
                      &#8593;
                    </button>
                    <button
                      type="button"
                      disabled={place === rows.length - 1}
                      onClick={() => void move(item.media.id, 1)}
                      title="ниже в очереди"
                      aria-label="ниже в очереди"
                      className="frame px-2"
                    >
                      &#8595;
                    </button>

                    {item.media.kind === 'image' && item.media.id !== firstImage ? (
                      <button type="button" onClick={() => void makeCover(item.media.id)} className="frame px-2">
                        сделать обложкой
                      </button>
                    ) : null}

                    <ConfirmButton
                      label="убрать"
                      title="убрать медиа"
                      question={
                        <p>
                          «{item.media.title || KIND[item.media.kind]}» отвяжется от предмета. Файл на диске останется, но
                          прикрепить его заново придётся загрузкой.
                        </p>
                      }
                      onConfirm={async () => {
                        await send(`/media/${item.media.id}`, 'DELETE');
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <p className="hint mt-3">Вложенные предметы во вторую очередь попадают сами, их порядок задаётся в «что внутри».</p>
      </Modal>
    </>
  );
}
