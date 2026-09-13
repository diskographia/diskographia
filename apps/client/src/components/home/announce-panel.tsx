'use client';

import { useState } from 'react';

import { request } from '@/api/browser';
import { Hint } from '@/components/ui/hint';

interface AnnouncePanelProps {
  eventId: string;
  daysLeft: number;
  applicationsOpen: boolean;
  authed: boolean;
}

function daysWord(days: number): string {
  const tail = days % 100;

  if (tail >= 11 && tail <= 14) {
    return 'дней';
  }

  const last = days % 10;

  if (last === 1) {
    return 'день';
  }

  if (last >= 2 && last <= 4) {
    return 'дня';
  }

  return 'дней';
}

export function AnnouncePanel({ eventId, daysLeft, applicationsOpen, authed }: AnnouncePanelProps) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function apply(): Promise<void> {
    setState('sending');
    setError(null);

    const answer = await request(`/events/${eventId}/applications`, 'POST', { attachedEntityId: null });

    if (!answer.ok) {
      setError(answer.error);
      setState('failed');
      return;
    }

    setState('sent');
  }

  return (
    <div className="frame p-2">
      <strong>{daysLeft > 0 ? `до начала ${daysLeft} ${daysWord(daysLeft)}` : 'начинается сегодня'}</strong>

      {applicationsOpen && authed ? (
        <div className="mt-2">
          {state === 'sent' ? (
            <p>Заявка отправлена.</p>
          ) : (
            <button type="button" onClick={() => void apply()} disabled={state === 'sending'} className="frame px-2 py-1">
              {state === 'sending' ? 'отправляем' : 'подать участие'}
            </button>
          )}

          {state === 'failed' ? <p>{error}</p> : null}
          {state === 'sent' ? <Hint>Решение придёт уведомлением.</Hint> : null}
        </div>
      ) : null}
    </div>
  );
}
