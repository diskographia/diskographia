'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { failureText } from '@/api/failure';

// инвентарь профиля собирается из объектов с номером ячейки
export function InventoryToggle({ entityId, slotIndex }: { entityId: string; slotIndex: number | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inside = slotIndex !== null;

  async function toggle(): Promise<void> {
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/entities/${entityId}/inventory-slot`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotIndex: inside ? null : 0 }),
    });

    if (!response.ok) {
      setError(await failureText(response));
    }

    setBusy(false);
    router.refresh();
  }

  return (
    <span>
      <button type="button" onClick={() => void toggle()} disabled={busy} className="frame px-2 py-1">
        {inside ? 'убрать из инвентаря' : 'в инвентарь'}
      </button>
      {error ? <span className="ml-2">{error}</span> : null}
    </span>
  );
}
