import { index, pgTable, text, uuid, integer } from 'drizzle-orm/pg-core';

import { createdAt, primaryId } from './columns.js';
import { entities } from './entity.js';

// произвольные пары «подпись и значение»
export const entityMeta = pgTable(
  'entity_meta',
  {
    id: primaryId(),
    entityId: uuid('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    value: text('value').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [index('entity_meta_entity_idx').on(table.entityId, table.sortOrder)],
);

// произвольные пары «подпись и ссылка»
export const entityLinks = pgTable(
  'entity_links',
  {
    id: primaryId(),
    entityId: uuid('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    url: text('url').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [index('entity_links_entity_idx').on(table.entityId, table.sortOrder)],
);

// автор без аккаунта, владельцем остаётся платформа
export const entityDisplayAuthors = pgTable('entity_display_authors', {
  entityId: uuid('entity_id')
    .primaryKey()
    .references(() => entities.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  city: text('city'),
  country: text('country'),
  note: text('note'),
  createdAt: createdAt(),
});
