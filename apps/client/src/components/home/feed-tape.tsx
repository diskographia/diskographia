'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { previewUrl } from '@/api/urls';
import type { EntityCard } from '@/api/types';
import { StaticScreen } from '@/components/world/static-screen';
import { routes } from '@/routes';

import { useCarousel } from './carousel';

interface FeedTapeProps {
  items: EntityCard[];
  onShow?: (card: EntityCard) => void;
}

// лента главной: по одному предмету во весь экран, сама сменяется и листается стрелкой
export function FeedTape({ items, onShow }: FeedTapeProps) {
  const { index, next, hold } = useCarousel(items.length);
  const shown = items.length ? items[index % items.length]! : null;

  useEffect(() => {
    if (shown && onShow) {
      onShow(shown);
    }
  }, [shown, onShow]);

  if (!shown) {
    return <StaticScreen>no_data</StaticScreen>;
  }

  const preview = previewUrl(shown.coverPath);

  return (
    <div className="tape" {...hold}>
      <Link href={routes.entity(shown.ownerHandle, shown.slug)} className="tape-shot" title={`открыть: ${shown.title}`}>
        {preview ? <img src={preview} alt={shown.title} /> : <StaticScreen>no_signal</StaticScreen>}
      </Link>

      <span className="tape-name">
        {shown.title}
        {shown.displayAuthor ? <span className="hint"> {shown.displayAuthor.name}</span> : null}
      </span>

      {items.length > 1 ? (
        <button
          type="button"
          onClick={next}
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
