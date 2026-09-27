'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const GRAB_THRESHOLD = 4;
const STIFFNESS = 170;
const DAMPING = 22;

interface ElasticOptions {
  // куда класть сдвиг: элемент двигается сам, кто-то ещё может подстраиваться под него (провод за модулем)
  paint: (x: number, y: number) => void;
  // в захвате отказано: содержимое экранов, кнопки
  skip?: (target: HTMLElement) => boolean;
}

interface Pull {
  pointerId: number;
  // до захвата точка нажатия, после — якорь, от которого отмеряется сдвиг
  originX: number;
  originY: number;
  grabbed: boolean;
}

// упругий захват: тянешь, отпускаешь, пружиной возвращает на место. одна механика на модуль и на диск
export function useElasticDrag({ paint, skip }: ElasticOptions) {
  const state = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const drag = useRef<Pull | null>(null);
  const frame = useRef(0);
  const lastGrab = useRef(false);
  const [held, setHeld] = useState(false);

  const move = useCallback(
    (x: number, y: number) => {
      state.current.x = x;
      state.current.y = y;
      paint(x, y);
    },
    [paint],
  );

  const settle = useCallback(() => {
    cancelAnimationFrame(frame.current);

    let last = performance.now();

    const step = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.032);
      last = now;

      const body = state.current;

      body.vx += (-STIFFNESS * body.x - DAMPING * body.vx) * delta;
      body.vy += (-STIFFNESS * body.y - DAMPING * body.vy) * delta;
      move(body.x + body.vx * delta, body.y + body.vy * delta);

      if (Math.abs(body.x) < 0.4 && Math.abs(body.y) < 0.4 && Math.abs(body.vx) < 2 && Math.abs(body.vy) < 2) {
        body.vx = 0;
        body.vy = 0;
        move(0, 0);
        return;
      }

      frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
  }, [move]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function onPointerDown(event: React.PointerEvent<HTMLElement>): void {
    if (skip?.(event.target as HTMLElement)) {
      return;
    }

    cancelAnimationFrame(frame.current);
    drag.current = { pointerId: event.pointerId, originX: event.clientX, originY: event.clientY, grabbed: false };
    state.current.vx = 0;
    state.current.vy = 0;
  }

  function onPointerMove(event: React.PointerEvent<HTMLElement>): void {
    const pulled = drag.current;

    if (!pulled || pulled.pointerId !== event.pointerId) {
      return;
    }

    if (!pulled.grabbed) {
      if (Math.hypot(event.clientX - pulled.originX, event.clientY - pulled.originY) < GRAB_THRESHOLD) {
        return;
      }

      // перехват на лету: якорь встаёт так, чтобы тянуть от места, где поймали, а не от нуля
      pulled.originX = event.clientX - state.current.x;
      pulled.originY = event.clientY - state.current.y;
      pulled.grabbed = true;
      setHeld(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    move(event.clientX - pulled.originX, event.clientY - pulled.originY);
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
