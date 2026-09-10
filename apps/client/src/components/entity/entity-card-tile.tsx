import Link from 'next/link';

import { previewUrl } from '@/api/client';
import type { EntityCard } from '@/api/types';

interface EntityCardTileProps {
  card: EntityCard;
  href?: string;
  onPick?: () => void;
  selected?: boolean;
  pinned?: boolean;
}

// картинка в родных пропорциях, название поверх
export function EntityCardTile({ card, href, onPick, selected = false, pinned = false }: EntityCardTileProps) {
  const preview = previewUrl(card.coverPath);
  const ratio = card.coverWidth && card.coverHeight ? `${card.coverWidth} / ${card.coverHeight}` : '3 / 4';
  const outline = selected ? { outline: '2px solid #333' } : undefined;

  const inside = (
    <>
      {preview ? (
        <img src={preview} alt="" className="block w-full" style={{ aspectRatio: ratio, objectFit: 'cover' }} />
      ) : (
        <div className="placeholder w-full" style={{ aspectRatio: ratio }} />
      )}

      <span
        className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-xs"
        style={{ background: 'rgba(255,255,255,0.8)' }}
      >
        {card.title}
        {pinned ? ' (закреплено)' : null}
        {card.displayAuthor ? <span className="hint block">{card.displayAuthor.name}</span> : null}
      </span>
    </>
  );

  if (card.deleted) {
    return (
      <div className="frame relative block" style={{ opacity: 0.6 }}>
        {inside}
      </div>
    );
  }

  if (href) {
    return (
      <Link href={href} scroll={false} className="frame relative block" style={outline}>
        {inside}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className="frame relative block w-full text-left"
      style={outline}
    >
      {inside}
    </button>
  );
}
