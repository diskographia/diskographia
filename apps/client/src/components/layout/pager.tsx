'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

const GAP = 12;

// экран не прокручивается: содержимое разливается по колонкам шириной в экран и листается по кругу
export function Pager({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const flow = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);

  const measure = useCallback(() => {
    const inner = flow.current;

    if (!inner) {
      return;
    }

    const room = inner.clientWidth;

    if (room < 8) {
      return;
    }

    setWidth(room);

    const total = Math.max(1, Math.round((inner.scrollWidth + GAP) / (room + GAP)));

    setPages(total);
    setPage((current) => (current < total ? current : 0));
  }, []);

  useEffect(() => {
    const outer = box.current;
    const inner = flow.current;

    if (!outer || !inner) {
      return;
    }

    measure();

    const watcher = new ResizeObserver(measure);
    watcher.observe(outer);

    const changes = new MutationObserver(measure);
    changes.observe(inner, { childList: true, subtree: true, characterData: true, attributes: true });

    const later = window.setTimeout(measure, 300);

    return () => {
      watcher.disconnect();
      changes.disconnect();
      window.clearTimeout(later);
    };
  }, [measure]);

  return (
    <div ref={box} className="pager">
      <div
        ref={flow}
        className="pager-flow"
        style={
          width > 0
            ? { columnWidth: `${width}px`, columnGap: `${GAP}px`, transform: `translateX(-${page * (width + GAP)}px)` }
            : undefined
        }
      >
        {children}
      </div>

      {pages > 1 ? (
        <button
          type="button"
          onClick={() => setPage((value) => (value + 1) % pages)}
          className="pager-next"
          title={`дальше, ${page + 1} из ${pages}`}
          aria-label={`дальше, ${page + 1} из ${pages}`}
        >
          &rsaquo;
        </button>
      ) : null}
    </div>
  );
}
