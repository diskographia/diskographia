'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Modal } from '@/components/modal';
import { routes } from '@/routes';

import { useFrameActions } from './frame-actions';
import { useLeaveGuard } from './leave-guard';

interface Slot {
  label: string;
  href?: string;
  onPick?: () => void;
}

// плашки размечены по пазу: верх и высота посчитаны из наклонов спрайтов, низ чуть заходит под соседнюю
const SLOTS = [
  { top: 8.8, height: 29.0 },
  { top: 29.3, height: 28.1 },
  { top: 48.81, height: 29.25 },
  { top: 69.54, height: 28.84 },
];

// зелёные кнопки в рейке слева: первые две всегда навигация, две нижние по месту
export function FrameControls() {
  const router = useRouter();
  const { extra, previous, next } = useFrameActions();
  const { rule } = useLeaveGuard();
  const [pending, setPending] = useState<Slot | null>(null);

  const walk = (action: Slot | null) => {
    if (!action) {
      return;
    }

    if (action.href) {
      router.push(action.href);
      return;
    }

    action.onPick?.();
  };

  // с незаконченной страницы уходим либо по её правилу, либо с вопросом про сохранение
  const go = (action: Slot | null) => {
    if (!action) {
      return;
    }

    if (!rule) {
      walk(action);
      return;
    }

    if (rule.ask) {
      setPending(action);
      return;
    }

    rule.leave();
  };

  const home: Slot = { label: 'домой', href: routes.home() };

  const rail: (Slot | null)[] = [
    home,
    { label: 'назад', onPick: () => router.back() },
    extra[0] ?? null,
    extra[1] ?? null,
  ];

  return (
    <>
      <div className="rail">
        {rail.map((action, index) => (
          <button
            key={index}
            type="button"
            className="rail-slot"
            data-hold
            data-href={action?.href}
            style={{ top: `${SLOTS[index]!.top}%`, height: `${SLOTS[index]!.height}%`, zIndex: 4 - index }}
            disabled={!action}
            title={action?.label}
            aria-label={action?.label ?? 'кнопка не задействована'}
            onClick={() => go(action)}
          >
            <img src={`/decor/tab-${index + 1}.webp`} alt="" />
            <span className="rail-label">{action?.label ?? ''}</span>
          </button>
        ))}
      </div>

      <Modal title="уйти со страницы" open={!!pending} onClose={() => setPending(null)}>
        <p>На странице есть незаконченная работа. Сохранить её перед уходом?</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="frame px-2 py-1"
            onClick={() => {
              setPending(null);
              rule?.save();
            }}
          >
            сохранить и остаться
          </button>
          <button
            type="button"
            className="frame px-2 py-1"
            onClick={() => {
              const target = pending;

              setPending(null);
              rule?.leave();
              walk(target);
            }}
          >
            уйти без сохранения
          </button>
          <button type="button" className="frame px-2 py-1" onClick={() => setPending(null)}>
            остаться
          </button>
        </div>
      </Modal>

      {previous ? (
        <button
          type="button"
          className="knob knob-up"
          data-hold
          title={`предыдущее: ${previous.label}`}
          aria-label={`предыдущее: ${previous.label}`}
          onClick={() => go(previous)}
        >
          <img src="/decor/knob-up.webp" alt="" />
          <span className="knob-label">пред.</span>
        </button>
      ) : null}

      {next ? (
        <button
          type="button"
          className="knob knob-down"
          data-hold
          title={`следующее: ${next.label}`}
          aria-label={`следующее: ${next.label}`}
          onClick={() => go(next)}
        >
          <img src="/decor/knob-down.webp" alt="" />
          <span className="knob-label">след.</span>
        </button>
      ) : null}

    </>
  );
}
