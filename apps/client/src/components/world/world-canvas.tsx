'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { Deck } from '@/components/player/deck';

import { Boot } from './boot';
import { useElasticDrag } from './elastic-drag';
import { FrameControls } from './frame-controls';
import { HereBar } from './here';
import { Passage } from './passage';

// пропорция модуля задана спрайтом рамки, менять её нельзя
const RATIO = 2600 / 1757;
const MARGIN = 8;
const BLEED = 1.07;
const PAN_LIMIT = 240;
const CABLE_DRAG = 0.55;
const NARROW = 900;
const SHORT = 500;
const PHONE = 560;

// wide: горизонтальный модуль вписан в окно. tall: вертикальный, вписан в окно.
// scroll: вертикальный на низком окне (телефон боком), модуль шире окна не влезает, страница прокручивается.
// phone: телефон стоймя, рамки нет, экраны столбиком во всю ширину, страница прокручивается
type Layout = 'wide' | 'tall' | 'scroll' | 'phone';

// холст с модулем: тянешь, отпускаешь, пружиной возвращает
export function WorldCanvas({ children }: { children: ReactNode }) {
  const plane = useRef<HTMLDivElement>(null);
  const cable = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState({ width: 1200, height: 811 });
  const [layout, setLayout] = useState<Layout>('wide');

  const paint = useCallback((x: number, y: number) => {
    if (plane.current) {
      plane.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    // провод отстаёт от модуля, поэтому тянется слабее
    if (cable.current) {
      cable.current.style.transform = `translate3d(${x * -(1 - CABLE_DRAG)}px, ${y * -(1 - CABLE_DRAG)}px, 0)`;
    }
  }, []);

  // за содержимое экранов не тянем, там выделяется текст и жмутся кнопки
  const skip = useCallback((target: HTMLElement) => !!target.closest('[data-hold]'), []);
  const { held, handlers } = useElasticDrag({ limit: PAN_LIMIT, paint, skip });

  useEffect(() => {
    const fit = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const portrait = width < NARROW && width < height;
      const short = height < SHORT && width < NARROW * 1.5;

      if (width < PHONE && width < height) {
        setLayout('phone');
        setSize({ width, height: 0 });
        return;
      }

      if (portrait) {
        const tallHeight = (height - MARGIN) * BLEED;

        setLayout('tall');
        setSize({ width: Math.min((width - MARGIN) * BLEED, tallHeight / RATIO), height: tallHeight });
        return;
      }

      if (short) {
        const tallWidth = Math.min(width - MARGIN, 720);

        setLayout('scroll');
        setSize({ width: tallWidth, height: tallWidth * RATIO });
        return;
      }

      const wide = Math.min((width - MARGIN) * BLEED, (height - MARGIN) * BLEED * RATIO);

      setLayout('wide');
      setSize({ width: Math.max(wide, 320), height: Math.max(wide, 320) / RATIO });
    };

    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);

    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('orientationchange', fit);
    };
  }, []);

  const grabbable = layout !== 'scroll' && layout !== 'phone';
  const phone = layout === 'phone';

  return (
    <div className={`world world-${layout}`}>
      <div
        ref={plane}
        {...(grabbable ? handlers : {})}
        className="plane"
        style={{
          width: phone ? '100%' : size.width,
          height: phone ? 'auto' : size.height,
          cursor: grabbable ? (held ? 'grabbing' : 'grab') : 'default',
          // щипок оставлен браузеру: текст мелкий, увеличить его должно быть можно
          touchAction: grabbable ? 'pinch-zoom' : 'pan-y pinch-zoom',
        }}
      >
        <img ref={cable} src="/decor/cable.webp" alt="" aria-hidden className="cable" />

        <div className={`module${layout === 'wide' ? '' : phone ? ' phone' : ' tall'}`}>
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
