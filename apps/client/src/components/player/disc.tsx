'use client';

import { useCallback, useRef } from 'react';

import { useElasticDrag } from '@/components/world/elastic-drag';

const PULL_LIMIT = 240;

interface DiscProps {
  playing: boolean;
  idle: boolean;
  onPress: () => void;
}

// диск лежит на динамике поверх экрана: крутится, пока играет, и упруго дёргается, как сам модуль
export function Disc({ playing, idle, onPress }: DiscProps) {
  const node = useRef<HTMLDivElement>(null);

  const paint = useCallback((x: number, y: number) => {
    if (node.current) {
      node.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
  }, []);

  const { held, wasGrabbed, handlers } = useElasticDrag({ limit: PULL_LIMIT, paint });

  return (
    <div
      ref={node}
      className={`disc${held ? ' held' : ''}`}
      data-hold
      {...handlers}
      onClick={() => {
        // потянули и отпустили: это не нажатие
        if (!wasGrabbed()) {
          onPress();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={idle ? 'сета нет' : playing ? 'пауза' : 'включить сет'}
      title={idle ? 'диск: сет к этому предмету не приложен' : 'диск: нажать чтобы играть или ставить на паузу, тянуть чтобы подёргать'}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPress();
        }
      }}
    >
      <img src="/decor/disc.webp" alt="" draggable={false} className={`disc-face${playing ? ' spinning' : ''}`} />
    </div>
  );
}
