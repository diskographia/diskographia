'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { request } from '@/api/browser';

// инвентарь профиля собирается из предметов с номером ячейки
export function InventoryToggle({ entityId, slotIndex }: { entityId: string; slotIndex: number | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inside = slotIndex !== null;

  async function toggle(): Promise<void> {
    setBusy(true);
    setError(null);

    const answer = await request(`/entities/${entityId}/inventory-slot`, 'PUT', { slotIndex: inside ? null : 0 });

    setBusy(false);

    if (!answer.ok) {
      setError(answer.error);
      return;
    }

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
