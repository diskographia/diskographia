'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { request } from '@/api/browser';

export function RestoreButton({ entityId }: { entityId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function restore(): Promise<void> {
    setBusy(true);
    setError(null);

    const answer = await request(`/entities/${entityId}/restore`, 'POST');

    setBusy(false);

    if (!answer.ok) {
      setError(answer.error);
      return;
    }

    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => void restore()} disabled={busy} className="frame px-2">
        вернуть
      </button>
      {error ? <span className="hint">{error}</span> : null}
    </>
  );
}
