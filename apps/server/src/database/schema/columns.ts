import { sql } from 'drizzle-orm';
import { customType, timestamp, uuid } from 'drizzle-orm/pg-core';

export const tsvector = customType<{ data: string }>({
  dataType: () => 'tsvector',
});

export const primaryId = () => uuid('id').primaryKey().default(sql`uuidv7()`);

export const moment = (name: string) => timestamp(name, { withTimezone: true, precision: 3, mode: 'string' });

export const createdAt = () => moment('created_at').notNull().defaultNow();

export const updatedAt = () => moment('updated_at').notNull().defaultNow();

export const deletedAt = () => moment('deleted_at');
