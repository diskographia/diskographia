'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

const GAP = 12;

// экран не прокручивается: содержимое разливается по колонкам шириной в экран и листается по кругу
export function Pager({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const flow = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const [width, setWidth] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);
  const [seen, setSeen] = useState(path);

  // пейджер переживает переход между страницами, а номер страницы с прошлого адреса ему не нужен
  if (seen !== path) {
    setSeen(path);
    setPage(0);
  }

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

    // свои же перестановки колонок в замер не попадают, иначе замер зовёт сам себя
    const changes = new MutationObserver((records) => {
      if (records.some((record) => record.target !== inner || record.type !== 'attributes')) {
        measure();
      }
    });
    changes.observe(inner, { childList: true, subtree: true, characterData: true, attributes: true });

    // нажатие мышью ставит фокус на то, что уже видно: страницу не трогаем, иначе разбитые по колонкам
    // блоки отдают координаты первой колонки и экран прыгает назад. страницу ищем только для фокуса с клавиатуры
    let pointer = 0;

    const onPointer = () => {
      pointer = window.setTimeout(() => {
        pointer = 0;
      }, 400);
    };

    // браузер сам прокручивает спрятанное переполнение к фокусу: возвращаем и показываем нужную страницу
    const onFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target || !inner.contains(target) || width <= 0) {
        return;
      }

      outer.scrollLeft = 0;

      if (pointer) {
        return;
      }

      const box = target.getBoundingClientRect();
      const frame = outer.getBoundingClientRect();

      // уже на экране: ничего не листаем
      if (box.left >= frame.left - 1 && box.right <= frame.right + 1) {
        return;
      }

      const shift = box.left - inner.getBoundingClientRect().left;

      setPage(Math.max(0, Math.min(pages - 1, Math.floor(shift / (width + GAP)))));
    };

    const onScroll = () => {
      if (outer.scrollLeft !== 0) {
        outer.scrollLeft = 0;
      }
    };

    outer.addEventListener('pointerdown', onPointer, true);
    outer.addEventListener('focusin', onFocus);
    outer.addEventListener('scroll', onScroll);

    const later = window.setTimeout(measure, 300);

    return () => {
      watcher.disconnect();
      changes.disconnect();
      outer.removeEventListener('pointerdown', onPointer, true);
      outer.removeEventListener('focusin', onFocus);
      outer.removeEventListener('scroll', onScroll);
      window.clearTimeout(pointer);
      window.clearTimeout(later);
    };
  }, [measure, width, pages]);

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
