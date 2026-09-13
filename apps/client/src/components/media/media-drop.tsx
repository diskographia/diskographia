'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState, type ReactNode } from 'react';

import { progressLabel, useUploadQueue } from './upload-queue';

interface MediaDropProps {
  entityId: string;
  children: ReactNode;
}

// файлы кладутся перетаскиванием прямо в экран показа, кнопка рядом делает то же самое
export function MediaDrop({ entityId, children }: MediaDropProps) {
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [over, setOver] = useState(false);
  const refresh = useCallback(() => router.refresh(), [router]);
  const { upload, cancel, progress, error } = useUploadQueue(entityId, refresh);

  return (
    <div
      className="drop"
      data-over={over ? '' : undefined}
      onDragEnter={(event) => {
        event.preventDefault();
        depth.current += 1;
        setOver(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        // уход с дочернего элемента тоже шлёт dragleave, считаем вход и выход парами
        depth.current = Math.max(0, depth.current - 1);

        if (depth.current === 0) {
          setOver(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        depth.current = 0;
        setOver(false);
        void upload(event.dataTransfer.files);
      }}
    >
      {children}

      <input
        ref={picker}
        type="file"
        multiple
        onChange={(event) => {
          void upload(event.target.files);
          event.target.value = '';
        }}
        hidden
      />

      <button type="button" onClick={() => picker.current?.click()} className="drop-add frame px-2">
        + файл
      </button>

      {over ? <span className="drop-note">Отпустите файлы.</span> : null}

      {progress ? (
        <span className="drop-note">
          Грузится {progressLabel(progress)}{' '}
          <button type="button" onClick={cancel} className="frame px-1">
            отменить
          </button>
        </span>
      ) : null}

      {error ? <span className="drop-note">{error}</span> : null}
    </div>
  );
}
