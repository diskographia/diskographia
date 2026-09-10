'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ReadingValue {
  active: number | null;
  point: (slot: number | null) => void;
  pinned: number | null;
  pin: (slot: number | null) => void;
}

const ReadingContext = createContext<ReadingValue>({
  active: null,
  point: () => {},
  pinned: null,
  pin: () => {},
});

export function ReadingProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const point = useCallback((slot: number | null) => setActive(slot), []);
  const pin = useCallback((slot: number | null) => setPinned((current) => (current === slot ? null : slot)), []);
  const value = useMemo(() => ({ active, point, pinned, pin }), [active, point, pinned, pin]);

  return <ReadingContext.Provider value={value}>{children}</ReadingContext.Provider>;
}

export function useReading(): ReadingValue {
  return useContext(ReadingContext);
}

const MEDIA_TOKEN = /!\[\[(\d+)\]\]/g;

// текст идёт целиком, метка ![[N]] только помечает место: картинка показывается справа
export function ReadingText({ source }: { source: string }) {
  const box = useRef<HTMLDivElement>(null);
  const { point } = useReading();

  const blocks = useMemo(() => {
    const text = source.trim();
    const parts: { text: string; slot: number | null }[] = [];
    let cursor = 0;

    for (const match of text.matchAll(MEDIA_TOKEN)) {
      parts.push({ text: text.slice(cursor, match.index), slot: Number(match[1]) - 1 });
      cursor = match.index + match[0].length;
    }

    parts.push({ text: text.slice(cursor), slot: null });

    return parts;
  }, [source]);

  useEffect(() => {
    const node = box.current;

    if (!node) {
      return;
    }

    const holder = node.closest('[data-scroll]') ?? node.parentElement;

    if (!holder) {
      return;
    }

    const pick = () => {
      const edge = holder.getBoundingClientRect().top + 40;
      let chosen: number | null = null;

      for (const mark of node.querySelectorAll<HTMLElement>('[data-slot]')) {
        if (mark.getBoundingClientRect().top <= edge) {
          chosen = Number(mark.dataset.slot);
        }
      }

      point(chosen);
    };

    pick();
    holder.addEventListener('scroll', pick, { passive: true });

    return () => {
      holder.removeEventListener('scroll', pick);
      point(null);
    };
  }, [point, blocks]);

  return (
    <div ref={box} className="md reading">
      {blocks.map((block, index) => (
        <div key={index} data-slot={block.slot === null ? undefined : block.slot}>
          {block.text.trim() ? <Markdown remarkPlugins={[remarkGfm]}>{block.text}</Markdown> : null}
        </div>
      ))}
    </div>
  );
}
