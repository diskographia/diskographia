'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const GRAB_THRESHOLD = 4;
const STIFFNESS = 170;
const DAMPING = 22;

interface ElasticOptions {
  limit: number;
  // куда класть сдвиг: элемент двигается сам, кто-то ещё может подстраиваться под него (провод за модулем)
  paint: (x: number, y: number) => void;
  // в захвате отказано: содержимое экранов, кнопки
  skip?: (target: HTMLElement) => boolean;
}

// упругий захват: тянешь, отпускаешь, пружиной возвращает на место. одна механика на модуль и на диск
export function useElasticDrag({ limit, paint, skip }: ElasticOptions) {
  const state = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const drag = useRef<{ pointerId: number; startX: number; startY: number; grabbed: boolean } | null>(null);
  const frame = useRef(0);
  const lastGrab = useRef(false);
  const [held, setHeld] = useState(false);

  const settle = useCallback(() => {
    cancelAnimationFrame(frame.current);

    let last = performance.now();

    const step = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.032);
      last = now;

      const body = state.current;

      body.vx += (-STIFFNESS * body.x - DAMPING * body.vx) * delta;
      body.vy += (-STIFFNESS * body.y - DAMPING * body.vy) * delta;
      body.x += body.vx * delta;
      body.y += body.vy * delta;

      paint(body.x, body.y);

      if (Math.abs(body.x) < 0.4 && Math.abs(body.y) < 0.4 && Math.abs(body.vx) < 2 && Math.abs(body.vy) < 2) {
        Object.assign(body, { x: 0, y: 0, vx: 0, vy: 0 });
        paint(0, 0);
        return;
      }

      frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
  }, [paint]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function onPointerDown(event: React.PointerEvent<HTMLElement>): void {
    if (skip?.(event.target as HTMLElement)) {
      return;
    }

    cancelAnimationFrame(frame.current);
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, grabbed: false };
    state.current.vx = 0;
    state.current.vy = 0;
  }

  function onPointerMove(event: React.PointerEvent<HTMLElement>): void {
    const pulled = drag.current;

    if (!pulled || pulled.pointerId !== event.pointerId) {
      return;
    }

    const shiftX = event.clientX - pulled.startX;
    const shiftY = event.clientY - pulled.startY;

    if (!pulled.grabbed && Math.hypot(shiftX, shiftY) < GRAB_THRESHOLD) {
      return;
    }

    if (!pulled.grabbed) {
      pulled.grabbed = true;
      setHeld(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    state.current.x = Math.max(-limit, Math.min(limit, shiftX));
    state.current.y = Math.max(-limit, Math.min(limit, shiftY));
    paint(state.current.x, state.current.y);
  }

  function release(event: React.PointerEvent<HTMLElement>): void {
    const pulled = drag.current;

    if (!pulled || pulled.pointerId !== event.pointerId) {
      return;
    }

    lastGrab.current = pulled.grabbed;
    drag.current = null;
    setHeld(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    settle();
  }

  // клик, который на самом деле был захватом, не должен нажимать кнопку под курсором
  function wasGrabbed(): boolean {
    return lastGrab.current;
  }

  return {
    held,
    wasGrabbed,
    handlers: { onPointerDown, onPointerMove, onPointerUp: release, onPointerCancel: release },
  };
}
