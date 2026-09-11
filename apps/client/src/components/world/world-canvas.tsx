'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { Deck } from '@/components/player/deck';

import { Boot } from './boot';
import { FrameControls } from './frame-controls';
import { HereBar } from './here';
import { Passage } from './passage';

// пропорция модуля задана спрайтом рамки, менять её нельзя
const RATIO = 2600 / 1757;
const MARGIN = 8;
const BLEED = 1.07;
const PAN_LIMIT = 240;
const GRAB_THRESHOLD = 4;
const STIFFNESS = 170;
const DAMPING = 22;
const CABLE_DRAG = 0.55;

// холст с модулем: тянешь, отпускаешь, пружиной возвращает
export function WorldCanvas({ children }: { children: ReactNode }) {
  const plane = useRef<HTMLDivElement>(null);
  const cable = useRef<HTMLImageElement>(null);
  const camera = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const drag = useRef<{ pointerId: number; startX: number; startY: number; grabbed: boolean } | null>(null);
  const frame = useRef(0);
  const [size, setSize] = useState({ width: 1200, height: 811 });
  const [held, setHeld] = useState(false);
  const [tall, setTall] = useState(false);

  const paint = useCallback(() => {
    const { x, y } = camera.current;

    if (plane.current) {
      plane.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    // провод отстаёт от модуля, поэтому тянется слабее
    if (cable.current) {
      cable.current.style.transform = `translate3d(${x * -(1 - CABLE_DRAG)}px, ${y * -(1 - CABLE_DRAG)}px, 0)`;
    }
  }, []);

  const settle = useCallback(() => {
    cancelAnimationFrame(frame.current);

    let last = performance.now();

    const step = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.032);
      last = now;

      const state = camera.current;

      state.vx += (-STIFFNESS * state.x - DAMPING * state.vx) * delta;
      state.vy += (-STIFFNESS * state.y - DAMPING * state.vy) * delta;
      state.x += state.vx * delta;
      state.y += state.vy * delta;

      paint();

      if (Math.abs(state.x) < 0.4 && Math.abs(state.y) < 0.4 && Math.abs(state.vx) < 2 && Math.abs(state.vy) < 2) {
        Object.assign(state, { x: 0, y: 0, vx: 0, vy: 0 });
        paint();
        return;
      }

      frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
  }, [paint]);

  useEffect(() => {
    const fit = () => {
      const portrait = window.innerWidth < 900 && window.innerWidth < window.innerHeight;

      setTall(portrait);

      if (portrait) {
        const height = (window.innerHeight - MARGIN) * BLEED;

        setSize({ width: Math.min((window.innerWidth - MARGIN) * BLEED, height / RATIO), height });
        return;
      }

      const width = Math.min((window.innerWidth - MARGIN) * BLEED, (window.innerHeight - MARGIN) * BLEED * RATIO);

      setSize({ width: Math.max(width, 320), height: Math.max(width, 320) / RATIO });
    };

    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);

    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('orientationchange', fit);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    // за содержимое экранов не тянем, там выделяется текст и жмутся кнопки
    if ((event.target as HTMLElement).closest('[data-hold]')) {
      return;
    }

    cancelAnimationFrame(frame.current);
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, grabbed: false };
    camera.current.vx = 0;
    camera.current.vy = 0;
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>): void {
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

    camera.current.x = Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, shiftX));
    camera.current.y = Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, shiftY));
    paint();
  }

  function release(event: React.PointerEvent<HTMLDivElement>): void {
    const pulled = drag.current;

    if (!pulled || pulled.pointerId !== event.pointerId) {
      return;
    }

    drag.current = null;
    setHeld(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    settle();
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      <div
        ref={plane}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        className="pointer-events-auto relative"
        style={{
          width: size.width,
          height: size.height,
          willChange: 'transform',
          cursor: held ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      >
        <img ref={cable} src="/decor/cable.webp" alt="" aria-hidden className="cable" />

        <div className={`module world-panel${tall ? ' tall' : ''}`}>
          <div className="module-frame" />
          <Deck />
          <FrameControls />
          <HereBar />
          <Boot />
          <Passage />
          {children}
        </div>
      </div>
    </div>
  );
}
