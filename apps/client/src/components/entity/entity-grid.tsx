'use client';

import { useState } from 'react';

import type { EntityCard } from '@/api/types';
import { Hint } from '@/components/ui/hint';
import { routes } from '@/routes';

import { EntityCardTile } from './entity-card-tile';

export interface GridItem {
  card: EntityCard;
  pinned?: boolean;
}

interface EntityGridProps {
  items: GridItem[];
  selectedSlug?: string | null;
  container?: { handle: string; slug: string };
}

// клик выбирает, повторный снимает выбор, вход внутрь через картинку справа.
// выбор живёт в адресе, а плитка подсвечивается сразу, пока сервер отвечает
export function EntityGrid({ items, selectedSlug = null, container }: EntityGridProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [seen, setSeen] = useState(selectedSlug);

  // адрес догнал выбор: временная подсветка больше не нужна
  if (seen !== selectedSlug) {
    setSeen(selectedSlug);
    setPending(null);
  }

  if (items.length === 0) {
    return <p>Пусто.</p>;
  }

  const shownSlug = pending ?? selectedSlug;

  return (
    <div>
      {container ? <Hint>Нажми на работу, чтобы посмотреть её справа. Второе нажатие снимает выбор.</Hint> : null}

      <div className="entity-grid mt-2">
        {items.map(({ card, pinned }) => {
          const selected = card.slug === shownSlug;
          const href = !container
            ? routes.entity(card.ownerHandle, card.slug)
            : selected
              ? routes.entity(container.handle, container.slug)
              : routes.entitySelected(container.handle, container.slug, card.slug);

          return (
            <div key={card.id} className="entity-cell">
              <EntityCardTile
                card={card}
                href={href}
                selected={selected}
                pinned={pinned}
                onPick={container ? () => setPending(selected ? '' : card.slug) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
