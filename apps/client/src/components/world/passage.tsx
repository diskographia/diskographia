'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AsciiWait } from './ascii';

const FADE_MS = 220;
const GIVE_UP_MS = 8000;

// смена модуля показывает ascii-логотип, выбор внутри страницы его не трогает
export function Passage() {
  const mark = useRef<HTMLSpanElement>(null);
  const path = usePathname();
  const known = useRef(path);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    let timer = 0;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const link = target?.closest('a[href]') as HTMLAnchorElement | null;
      const rail = target?.closest('.rail-slot:not(:disabled)') as HTMLElement | null;

      if (!link && !rail) {
        return;
      }

      if (rail && (rail.dataset.href ?? '') === window.location.pathname) {
        return;
      }

      // логотип только при переходе на другую страницу, выбор объекта идёт запросом
      if (link) {
        const href = link.getAttribute('href') ?? '';

        if (!href.startsWith('/') || link.target === '_blank') {
          return;
        }

        if (href.split('?')[0] === window.location.pathname) {
          return;
        }
      }

      window.clearTimeout(timer);
      timer = window.setTimeout(() => setWaiting(false), GIVE_UP_MS);
      setWaiting(true);
    };

    document.addEventListener('click', onClick, true);

    return () => {
      document.removeEventListener('click', onClick, true);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (known.current === path) {
      return;
    }

    known.current = path;
    setWaiting(false);

    const panel = mark.current?.closest('.module');

    if (!panel) {
      return;
    }

    panel.setAttribute('data-fresh', '');
    const timer = window.setTimeout(() => panel.removeAttribute('data-fresh'), FADE_MS);

    return () => window.clearTimeout(timer);
  }, [path]);

  return (
    <>
      <span ref={mark} hidden />
      {waiting ? (
        <div className="slot slot-feed passage" aria-live="polite">
          <div className="screen slot-body">
            <AsciiWait />
          </div>
        </div>
      ) : null}
    </>
  );
}
