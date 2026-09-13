'use client';

import { useCallback, useRef, useState } from 'react';

import { uploadFile, type UploadHandle } from '@/api/browser';

export interface UploadProgress {
  index: number;
  total: number;
  name: string;
  ratio: number;
}

// файлы уходят по одному, чтобы сбойный не ронял остальные; ход и отмена общие для кнопки и перетаскивания
export function useUploadQueue(entityId: string, onDone: () => void) {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<UploadHandle | null>(null);
  const stopped = useRef(false);

  const upload = useCallback(
    async (files: FileList | File[] | null) => {
      const list = files ? Array.from(files) : [];

      if (list.length === 0) {
        return;
      }

      setError(null);
      stopped.current = false;

      for (const [index, file] of list.entries()) {
        if (stopped.current) {
          break;
        }

        setProgress({ index: index + 1, total: list.length, name: file.name, ratio: 0 });

        const handle = uploadFile(`/entities/${entityId}/media`, file, (ratio) =>
          setProgress({ index: index + 1, total: list.length, name: file.name, ratio }),
        );

        current.current = handle;

        const outcome = await handle.done;

        current.current = null;

        if (!outcome.ok) {
          setError(`${file.name}: ${outcome.error}`);
          break;
        }
      }

      setProgress(null);
      onDone();
    },
    [entityId, onDone],
  );

  const cancel = useCallback(() => {
    stopped.current = true;
    current.current?.abort();
  }, []);

  return { upload, cancel, progress, error };
}

export function progressLabel(progress: UploadProgress): string {
  return `${progress.index} из ${progress.total}, ${Math.round(progress.ratio * 100)}%: ${progress.name}`;
}
