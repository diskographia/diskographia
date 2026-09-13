'use client';

import { useState } from 'react';

// адрес предмета в буфер: для «по ссылке» это единственный способ поделиться
export function CopyLink({ path }: { path: string }) {
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      className="frame px-2"
      title="скопировать адрес"
      onClick={() => {
        void navigator.clipboard.writeText(`${window.location.origin}${path}`).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      {done ? 'скопировано' : 'ссылка'}
    </button>
  );
}
