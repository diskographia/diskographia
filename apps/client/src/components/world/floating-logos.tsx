'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { request } from '@/api/browser';
import type { ManifestView } from '@/api/types';
import { EntityGrid } from '@/components/entity/entity-grid';
import { MarkdownView } from '@/components/entity/markdown-view';
import { Modal } from '@/components/modal';

export const MANIFEST_EVENT = 'diskographia:manifest';

const SIZE = 104;
const SPEED = 90;

interface Body {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

// логотипы летают как заставка dvd, по нажатию манифест
export function FloatingLogos() {
  const layer = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLButtonElement | null)[]>([]);
  const [open, setOpen] = useState(false);
  const [manifest, setManifest] = useState<ManifestView | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const box = layer.current;

    if (!box) {
      return;
    }

    const bodies: Body[] = [
      { x: 40, y: 40, dx: SPEED, dy: SPEED * 0.7 },
      { x: 240, y: 180, dx: -SPEED * 0.8, dy: SPEED * 0.9 },
    ];

    let last = performance.now();
    let frame = 0;

    const place = () => {
      bodies.forEach((body, index) => {
        const node = nodes.current[index];

        if (node) {
          node.style.transform = `translate3d(${body.x}px, ${body.y}px, 0)`;
        }
      });
    };

    const step = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;

      const width = box.clientWidth - SIZE;
      const height = box.clientHeight - SIZE;

      for (const body of bodies) {
        body.x += body.dx * delta;
        body.y += body.dy * delta;

        if (body.x <= 0 || body.x >= width) {
          body.dx *= -1;
          body.x = Math.max(0, Math.min(width, body.x));
        }

        if (body.y <= 0 || body.y >= height) {
          body.dy *= -1;
          body.y = Math.max(0, Math.min(height, body.y));
        }
      }

      const [first, second] = bodies as [Body, Body];
      const gapX = second.x - first.x;
      const gapY = second.y - first.y;

      // столкнулись: разводим по той оси, где перекрытие меньше, и толкаем в разные стороны
      if (Math.abs(gapX) < SIZE && Math.abs(gapY) < SIZE) {
        if (Math.abs(gapX) > Math.abs(gapY)) {
          const sign = Math.sign(gapX) || 1;
          first.dx = -Math.abs(first.dx) * sign;
          second.dx = Math.abs(second.dx) * sign;
        } else {
          const sign = Math.sign(gapY) || 1;
          first.dy = -Math.abs(first.dy) * sign;
          second.dy = Math.abs(second.dy) * sign;
        }
      }

      place();
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, []);

  // манифест читается при каждом открытии: его могли включить только что
  const show = useCallback(async () => {
    const fresh = await request<ManifestView | null>('/feed/manifest');
    const view = fresh.ok ? fresh.data : null;

    setManifest(view);
    setMissing(!view);
    setOpen(true);
  }, []);

  useEffect(() => {
    const listen = () => void show();

    window.addEventListener(MANIFEST_EVENT, listen);

    return () => window.removeEventListener(MANIFEST_EVENT, listen);
  }, [show]);

  const article = manifest?.children[0] ?? null;
  const rest = manifest?.children.slice(1) ?? [];

  return (
    <>
      {/* слой стоит нулевым: ниже отрицательного нажатие забирает body, а модуль всё равно рисуется поверх */}
      <div ref={layer} className="logos" data-hold>
        {[0, 1].map((index) => (
          <button
            key={index}
            type="button"
            ref={(node) => {
              nodes.current[index] = node;
            }}
            onClick={() => void show()}
            aria-label="манифест"
            title="манифест Дискографии, нажми"
            className="logo"
            style={{ width: SIZE, height: SIZE }}
          >
            <img src={`/decor/logo-${index + 1}.webp`} alt="" className="h-full w-full" />
          </button>
        ))}
      </div>

      <Modal title={article?.title ?? manifest?.title ?? 'манифест'} open={open} onClose={() => setOpen(false)} half>
        {missing ? (
          <p>Манифест пока не опубликован.</p>
        ) : (
          <>
            <MarkdownView source={article?.descriptionMd || manifest?.descriptionMd || ''} />

            {rest.length > 0 ? (
              <div className="mt-3">
                <EntityGrid items={rest.map((card) => ({ card }))} />
              </div>
            ) : null}
          </>
        )}
      </Modal>
    </>
  );
}
