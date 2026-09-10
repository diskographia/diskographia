'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { fileUrl } from '@/api/client';
import { failureText } from '@/api/failure';
import type { MediaItem } from '@/api/types';
import { Modal } from '@/components/modal';

const KIND: Record<string, string> = {
  image: 'картинка',
  audio: 'звук',
  video: 'видео',
  model: 'сцена',
  embed: 'трансляция',
  file: 'файл',
};

// две очереди правого экрана: сверху трансляции и видео, под ними фото
const QUEUES: { title: string; note: string; kinds: string[] }[] = [
  {
    title: 'первая очередь: трансляции и видео',
    note: 'показывается вместо всего остального и сама не листается',
    kinds: ['embed', 'video'],
  },
  {
    title: 'вторая очередь: фото',
    note: 'крутится по кругу вместе с вложенными объектами, пока первой очереди нет',
    kinds: ['image'],
  },
  {
    title: 'вне очереди',
    note: 'звук уходит в плеер, сцена и файлы открываются отдельно',
    kinds: ['audio', 'model', 'file'],
  },
];

interface MediaManagerProps {
  entityId: string;
  media: MediaItem[];
  label?: string;
}

interface Progress {
  done: number;
  total: number;
  current: string;
}

export function MediaManager({ entityId, media, label }: MediaManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [stream, setStream] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function send(path: string, method: string, body?: unknown): Promise<boolean> {
    setError(null);

    const response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      setError(await failureText(response));
      return false;
    }

    router.refresh();
    return true;
  }

  // файлы уходят по одному, чтобы сбойный не ронял остальные
  async function upload(files: FileList): Promise<void> {
    setError(null);

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]!;
      setProgress({ done: index, total: files.length, current: file.name });

      const body = new FormData();
      body.append('file', file);

      const response = await fetch(`/api/entities/${entityId}/media`, { method: 'POST', body });

      if (!response.ok) {
        setError(`${file.name}: ${await failureText(response)}`);
        break;
      }
    }

    setProgress(null);
    router.refresh();
  }

  async function addStream(): Promise<void> {
    const url = stream.trim();

    if (!url) {
      return;
    }

    if (await send(`/api/entities/${entityId}/media/embed`, 'POST', { url })) {
      setStream('');
    }
  }

  // порядок задаётся списком целиком: сервер принимает только полную перестановку
  async function move(mediaId: string, step: number): Promise<void> {
    const ids = media.map((item) => item.media.id);
    const from = ids.indexOf(mediaId);
    const to = from + step;

    if (from < 0 || to < 0 || to >= ids.length) {
      return;
    }

    ids.splice(to, 0, ids.splice(from, 1)[0]!);

    await send(`/api/entities/${entityId}/media/order`, 'PATCH', { ids });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="frame px-2 py-1">
        {label ?? 'медиа'} ({media.length})
      </button>

      <Modal title="медиа и очереди объекта" open={open} onClose={() => setOpen(false)}>
        <input
          type="file"
          multiple
          accept="image/*,audio/*,video/*,.glb,.gltf,.zip,.pdf"
          onChange={(event) => {
            if (event.target.files?.length) {
              void upload(event.target.files);
            }
          }}
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={stream}
            onChange={(event) => setStream(event.target.value)}
            placeholder="ссылка на трансляцию: youtube или twitch"
            className="frame flex-1 p-1"
          />
          <button type="button" onClick={() => void addStream()} className="frame px-2 py-1">
            в первую очередь
          </button>
        </div>

        {progress ? (
          <p className="mt-1">
            загружается {progress.done + 1} из {progress.total}: {progress.current}
          </p>
        ) : null}

        {error ? <p className="mt-1">ошибка: {error}</p> : null}

        {QUEUES.map((queue) => {
          const rows = media.filter((item) => queue.kinds.includes(item.media.kind));

          return (
            <section key={queue.title} className="mt-3">
              <strong>{queue.title}</strong>
              <p className="hint">{queue.note}</p>

              {rows.length === 0 ? <p className="mt-1">пусто</p> : null}

              <ul className="mt-1">
                {rows.map((item) => (
                  <li key={item.media.id} className="frame mb-2 flex items-center gap-2 p-2">
                    {item.file && item.media.kind === 'image' ? (
                      <img src={fileUrl(item.file.path) ?? ''} alt="" className="h-16 w-16 object-cover" />
                    ) : (
                      <span className="placeholder inline-block h-16 w-16" />
                    )}

                    <span className="flex-1">
                      <input
                        defaultValue={item.media.title ?? ''}
                        onBlur={(event) => void send(`/api/media/${item.media.id}`, 'PATCH', { title: event.target.value })}
                        placeholder="название"
                        className="frame block w-full p-1"
                      />
                      <span className="hint">
                        {KIND[item.media.kind] ?? item.media.kind}
                        {item.file ? `, ${Math.round(item.file.sizeBytes / 1024)} КБ` : ''}
                        {item.media.embedUrl ? `, ${item.media.embedUrl}` : ''}
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={() => void move(item.media.id, -1)}
                      title="выше в очереди"
                      aria-label="выше в очереди"
                      className="frame px-2"
                    >
                      &#8593;
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(item.media.id, 1)}
                      title="ниже в очереди"
                      aria-label="ниже в очереди"
                      className="frame px-2"
                    >
                      &#8595;
                    </button>
                    <button
                      type="button"
                      onClick={() => void send(`/api/media/${item.media.id}`, 'DELETE')}
                      className="frame px-2"
                    >
                      убрать
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <p className="hint mt-3">вложенные объекты во вторую очередь попадают сами, их порядок задаётся в «содержимом»</p>
      </Modal>
    </>
  );
}
