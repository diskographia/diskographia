'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { routes } from '@/routes';

import { MANIFEST_EVENT } from './floating-logos';
import { useFrameActions, type FrameAction } from './frame-actions';
import { useLeaveGuard, type LeaveAction } from './leave-guard';

interface Slot extends LeaveAction {
  label: string;
  stays?: boolean;
}

// плашки размечены по пазу: верх и высота посчитаны из наклонов спрайтов, низ чуть заходит под соседнюю
const SLOTS = [
  { top: 8.8, height: 29.0 },
  { top: 29.3, height: 28.1 },
  { top: 48.81, height: 29.25 },
  { top: 69.54, height: 28.84 },
];

const STEPS_KEY = 'diskographia-steps';

// сколько переходов сделано в этой вкладке: с первой страницы «назад» ведёт домой, а не с сайта
function useSteps(): void {
  const path = usePathname();

  useEffect(() => {
    try {
      sessionStorage.setItem(STEPS_KEY, String(stepsMade() + 1));
    } catch {
      // без sessionStorage «назад» просто ведёт домой
    }
  }, [path]);
}

function stepsMade(): number {
  try {
    return Number(sessionStorage.getItem(STEPS_KEY) ?? '0');
  } catch {
    return 0;
  }
}

function toSlot(action: FrameAction | null): Slot | null {
  return action ? { label: action.label, href: action.href } : null;
}

// зелёные кнопки в рейке слева: первые две всегда навигация, две нижние по месту
export function FrameControls() {
  const router = useRouter();
  const path = usePathname();
  const { extra, previous, next } = useFrameActions();
  const { attempt } = useLeaveGuard();

  useSteps();

  const home: Slot = { label: 'домой', href: routes.home() };
  const back: Slot = {
    label: 'назад',
    onPick: () => {
      if (stepsMade() > 1) {
        router.back();
      } else {
        router.push(routes.home());
      }
    },
  };

  // на главной третья клавиша открывает манифест: на телефоне логотипы закрыты модулем
  const place: (Slot | null)[] =
    path === routes.home() && extra.length === 0
      ? [{ label: 'манифест', stays: true, onPick: () => window.dispatchEvent(new Event(MANIFEST_EVENT)) }, null]
      : [toSlot(extra[0] ?? null), toSlot(extra[1] ?? null)];

  const rail: (Slot | null)[] = [home, back, ...place];

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
            data-stay={action?.stays ? '' : undefined}
            style={{ top: `${SLOTS[index]!.top}%`, height: `${SLOTS[index]!.height}%`, zIndex: 4 - index }}
            disabled={!action}
            title={action?.label}
            aria-label={action?.label ?? 'кнопка не задействована'}
            onClick={() => action && attempt(action)}
          >
            <img src={`/decor/tab-${index + 1}.webp`} alt="" />
            <span className="rail-label">{action?.label ?? ''}</span>
          </button>
        ))}
      </div>

      {previous ? (
        <button
          type="button"
          className="knob knob-up"
          data-hold
          title={`предыдущее: ${previous.label}`}
          aria-label={`предыдущее: ${previous.label}`}
          onClick={() => attempt(previous)}
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
          onClick={() => attempt(next)}
        >
          <img src="/decor/knob-down.webp" alt="" />
          <span className="knob-label">след.</span>
        </button>
      ) : null}
    </>
  );
}
