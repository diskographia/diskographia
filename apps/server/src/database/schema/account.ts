import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { createdAt, deletedAt, updatedAt } from './columns.js';

// персональные данные, уедут в базу в рф. связи с profiles нет намеренно
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  phone: text('phone'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
});
