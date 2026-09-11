'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { previewUrl } from '@/api/client';
import type { EntityCard } from '@/api/types';
import { StaticScreen } from '@/components/world/static-screen';
import { routes } from '@/routes';

// интервал не согласован
const INTERVAL_MS = 5000;

interface FeedTapeProps {
  items: EntityCard[];
  onShow?: (card: EntityCard) => void;
}

// лента главной: по одному объекту во весь экран, сама сменяется и листается стрелкой
export function FeedTape({ items, onShow }: FeedTapeProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const shown = items.length ? items[index % items.length]! : null;

  useEffect(() => {
    if (shown && onShow) {
      onShow(shown);
    }
  }, [shown, onShow]);

  useEffect(() => {
    if (items.length < 2 || paused) {
      return;
    }

    const timer = setInterval(() => setIndex((value) => (value + 1) % items.length), INTERVAL_MS);

    return () => clearInterval(timer);
  }, [items.length, paused]);

  if (items.length === 0) {
    return <StaticScreen>no_data</StaticScreen>;
  }

  const card = shown!;
  const preview = previewUrl(card.coverPath);

  return (
    <div className="tape" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <Link href={routes.entity(card.ownerHandle, card.slug)} className="tape-shot" title={`открыть: ${card.title}`}>
        {preview ? <img src={preview} alt="" /> : <StaticScreen>no_signal</StaticScreen>}
      </Link>

      <span className="tape-name">
        {card.title}
        {card.displayAuthor ? <span className="hint"> {card.displayAuthor.name}</span> : null}
      </span>

      {items.length > 1 ? (
        <button
          type="button"
          onClick={() => setIndex((value) => (value + 1) % items.length)}
          className="tape-next"
          title={`следующее, всего ${items.length}`}
          aria-label="следующее"
        >
          &rsaquo;
        </button>
      ) : null}
    </div>
  );
}
