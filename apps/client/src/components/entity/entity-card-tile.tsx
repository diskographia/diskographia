import Link from 'next/link';

import { previewUrl } from '@/api/urls';
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

  const inside = (
    <>
      {preview ? (
        <img src={preview} alt="" loading="lazy" className="block w-full" style={{ aspectRatio: ratio, objectFit: 'cover' }} />
      ) : (
        <div className="placeholder w-full" style={{ aspectRatio: ratio }} />
      )}

      <span className="tile-name">
        {card.title}
        {pinned ? ' (закреплено)' : null}
        {card.displayAuthor ? <span className="hint block">{card.displayAuthor.name}</span> : null}
      </span>
    </>
  );

  if (card.deleted) {
    return <div className="tile tile-gone">{inside}</div>;
  }

  if (href) {
    return (
      <Link href={href} scroll={false} onClick={onPick} aria-current={selected ? 'true' : undefined} className="tile">
        {inside}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onPick} aria-pressed={selected} className="tile w-full text-left">
      {inside}
    </button>
  );
}
