import { pgTable, text } from 'drizzle-orm/pg-core';

import { createdAt, primaryId } from './columns.js';

export const tags = pgTable('tags', {
  id: primaryId(),
  name: text('name').notNull().unique(),
  createdAt: createdAt(),
});
