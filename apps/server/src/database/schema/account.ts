import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { createdAt, deletedAt, moment, primaryId, updatedAt } from './columns.js';

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

// выход и смена пароля гасят сессию, иначе токен живёт до истечения
export const sessions = pgTable(
  'sessions',
  {
    id: primaryId(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    expiresAt: moment('expires_at').notNull(),
    revokedAt: moment('revoked_at'),
  },
  (table) => [index('sessions_account_idx').on(table.accountId, table.revokedAt)],
);
