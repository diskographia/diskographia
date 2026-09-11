'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type ReactNode } from 'react';

import { failureText } from '@/api/failure';

interface MediaDropProps {
  entityId: string;
  children: ReactNode;
}

// файлы кладутся перетаскиванием прямо в экран показа, кнопка рядом делает то же самое
export function MediaDrop({ entityId, children }: MediaDropProps) {
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) {
      return;
    }

    setError(null);

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]!;
      setBusy(`${index + 1} из ${files.length}: ${file.name}`);

      const body = new FormData();
      body.append('file', file);

      const response = await fetch(`/api/entities/${entityId}/media`, { method: 'POST', body });

      if (!response.ok) {
        setError(`${file.name}: ${await failureText(response)}`);
        break;
      }
    }

    setBusy(null);
    router.refresh();
  }

  return (
    <div
      className="drop"
      data-over={over ? '' : undefined}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        void upload(event.dataTransfer.files);
      }}
    >
      {children}

      <input
        ref={picker}
        type="file"
        multiple
        accept="image/*,audio/*,video/*,.glb,.gltf,.zip,.pdf"
        onChange={(event) => void upload(event.target.files)}
        hidden
      />

      <button type="button" onClick={() => picker.current?.click()} className="drop-add frame px-2">
        + файл
      </button>

      {over ? <span className="drop-note">отпустите файлы</span> : null}
      {busy ? <span className="drop-note">грузится {busy}</span> : null}
      {error ? <span className="drop-note">{error}</span> : null}
    </div>
  );
}
