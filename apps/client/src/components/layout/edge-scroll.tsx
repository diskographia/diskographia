'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const LINE = 18;
const LEDS = 14;

// полоса живёт на ребре модуля и двигает экран построчно, рывками, как в старых окнах
export function EdgeScroll({ target, className }: { target: string; className: string }) {
  const path = usePathname();
  const track = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLElement | null>(null);
  const [ratio, setRatio] = useState(0);
  const [scrolls, setScrolls] = useState(false);
  const [held, setHeld] = useState(false);

  const measure = useCallback(() => {
    const node = box.current;

    if (!node) {
      return;
    }

    const room = node.scrollHeight - node.clientHeight;

    setScrolls(room > 4);
    setRatio(room > 0 ? node.scrollTop / room : 0);
  }, []);

  useEffect(() => {
    const node = document.querySelector<HTMLElement>(`[data-scroll="${target}"]`);

    box.current = node;

    if (!node) {
      return;
    }

    measure();
    node.addEventListener('scroll', measure, { passive: true });

    const watcher = new ResizeObserver(measure);
    watcher.observe(node);

    // содержимое экрана меняется без смены адреса: выбор в контейнере, ответ сервера
    const watchChildren = () => {
      for (const child of node.children) {
        watcher.observe(child);
      }
    };

    watchChildren();

    const changes = new MutationObserver(() => {
      watchChildren();
      measure();
    });
    changes.observe(node, { childList: true, subtree: true });

    return () => {
      node.removeEventListener('scroll', measure);
      watcher.disconnect();
      changes.disconnect();
    };
  }, [target, measure, path]);

  const step = useCallback((lines: number) => {
    const node = box.current;

    if (!node) {
      return;
    }

    node.scrollTop = Math.round((node.scrollTop + lines * LINE) / LINE) * LINE;
  }, []);

  const dragTo = useCallback((clientY: number) => {
    const node = box.current;
    const rail = track.current;

    if (!node || !rail) {
      return;
    }

    const bounds = rail.getBoundingClientRect();
    const room = node.scrollHeight - node.clientHeight;
    const inside = Math.min(1, Math.max(0, (clientY - bounds.top) / Math.max(bounds.height, 1)));

    node.scrollTop = Math.round((inside * room) / LINE) * LINE;
  }, []);

  if (!scrolls) {
    return null;
  }

  // пролистанное покрывается горящими светодиодами, как уровень в эквалайзере: верхние два горят жёлтым
  const lit = Math.round(ratio * LEDS);

  return (
    <div className={`edge-rail ${className}`} data-hold title={`прокрутка: ${Math.round(ratio * 100)}%`}>
      <button type="button" className="edge-step" onClick={() => step(-1)} title="строкой выше" aria-label="строкой выше">
        &#9650;
      </button>

      <div
        ref={track}
        className="edge-track"
        role="slider"
        aria-label="положение ленты"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        style={{ touchAction: 'none' }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setHeld(true);
          dragTo(event.clientY);
        }}
        onPointerMove={(event) => {
          if (held) {
            dragTo(event.clientY);
          }
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          setHeld(false);
        }}
        onPointerCancel={() => setHeld(false)}
      >
        {Array.from({ length: LEDS }, (_, index) => {
          const on = index < lit;
          const peak = on && index >= lit - 2;

          return <span key={index} className={`led${on ? (peak ? ' led-peak' : ' led-on') : ''}`} />;
        })}
      </div>

      <button type="button" className="edge-step" onClick={() => step(1)} title="строкой ниже" aria-label="строкой ниже">
        &#9660;
      </button>
    </div>
  );
}
