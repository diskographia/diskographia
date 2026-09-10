import { index, jsonb, pgTable, uuid } from 'drizzle-orm/pg-core';

import { createdAt, moment, primaryId } from './columns.js';
import { notificationKind } from './enums.js';
import { profiles } from './profile.js';

export const notifications = pgTable(
  'notifications',
  {
    id: primaryId(),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    kind: notificationKind('kind').notNull(),
    payload: jsonb('payload').notNull().default({}),
    readAt: moment('read_at'),
    createdAt: createdAt(),
  },
  (table) => [index('notifications_inbox_idx').on(table.recipientId, table.readAt, table.createdAt)],
);
