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

// клик выбирает, повторный снимает выбор, вход внутрь через картинку справа
export function EntityGrid({ items, selectedSlug = null, container }: EntityGridProps) {
  if (items.length === 0) {
    return <p>пусто</p>;
  }

  return (
    <div>
      {container ? <Hint>нажми на работу, чтобы посмотреть её справа. второе нажатие снимает выбор</Hint> : null}

      <div className="mt-2 columns-2 gap-3 lg:columns-3">
      {items.map(({ card, pinned }) => {
        const selected = card.slug === selectedSlug;
        const href = !container
          ? routes.entity(card.ownerHandle, card.slug)
          : selected
            ? routes.entity(container.handle, container.slug)
            : routes.entitySelected(container.handle, container.slug, card.slug);

        return (
          <div key={card.id} className="mb-3 break-inside-avoid">
            <EntityCardTile card={card} href={href} selected={selected} pinned={pinned} />
          </div>
        );
      })}
      </div>
    </div>
  );
}
