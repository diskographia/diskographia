import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { createdAt, moment, primaryId } from './columns.js';
import { entities } from './entity.js';

// дни получаются группировкой по дате
export const eventSchedule = pgTable(
  'event_schedule',
  {
    id: primaryId(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    startsAt: moment('starts_at').notNull(),
    endsAt: moment('ends_at'),
    title: text('title').notNull(),
    shortMd: text('short_md').notNull().default(''),
    fullMd: text('full_md').notNull().default(''),
    createdAt: createdAt(),
  },
  (table) => [index('event_schedule_event_idx').on(table.eventId, table.startsAt)],
);
