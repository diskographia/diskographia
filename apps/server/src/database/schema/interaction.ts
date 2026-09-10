import { index, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';

import { createdAt } from './columns.js';
import { entities } from './entity.js';
import { profiles } from './profile.js';

// одна строка на пару «объект и человек», гости не считаются
export const entityViews = pgTable(
  'entity_views',
  {
    entityId: uuid('entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.entityId, table.profileId] }),
    index('entity_views_profile_idx').on(table.profileId),
  ],
);
