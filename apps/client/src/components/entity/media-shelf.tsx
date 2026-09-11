'use client';

import { fileUrl } from '@/api/client';
import type { MediaItem } from '@/api/types';

import { useReading } from './reading';

const KIND: Record<string, string> = {
  video: 'видео',
  embed: 'стрим',
  model: '3d',
  file: 'файл',
  audio: 'трек',
};

function weight(bytes: number): string {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} МБ` : `${Math.ceil(bytes / 1024)} КБ`;
}

// всё, что не картинка, лежит полкой: нажатие показывает это в экране справа
export function MediaShelf({ media }: { media: MediaItem[] }) {
  const { pinned, pin } = useReading();
  const shelf = media.map((item, index) => ({ item, index })).filter(({ item }) => item.media.kind !== 'image');
  const photos = media.filter((item) => item.media.kind === 'image').length;

  if (shelf.length === 0 && photos === 0) {
    return null;
  }

  return (
    <div className="mt-1">
      <strong>материалы</strong>
      {photos > 0 ? <p className="hint">фото: {photos}</p> : null}

      <ul className="mt-1 flex flex-wrap gap-1">
        {shelf.map(({ item, index }) => {
          const name = item.media.title ?? KIND[item.media.kind] ?? item.media.kind;
          const label = `${KIND[item.media.kind] ?? item.media.kind}: ${name}`;

          if (item.media.kind === 'file' && item.file) {
            return (
              <li key={item.media.id}>
                <a href={fileUrl(item.file.path) ?? '#'} download className="frame inline-block px-2">
                  {label}
                  <span className="hint"> {weight(item.file.sizeBytes)}</span>
                </a>
              </li>
            );
          }

          return (
            <li key={item.media.id}>
              <button
                type="button"
                onClick={() => pin(index)}
                aria-pressed={pinned === index}
                className="frame px-2"
              >
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
