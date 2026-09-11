'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { failureText } from '@/api/failure';

export function RestoreButton({ entityId }: { entityId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function restore(): Promise<void> {
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/entities/${entityId}/restore`, { method: 'POST' });

    if (!response.ok) {
      setError(await failureText(response));
      setBusy(false);
      return;
    }

    setBusy(false);
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
