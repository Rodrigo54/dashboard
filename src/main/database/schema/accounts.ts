import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { ACCOUNT_TYPES, enumValues } from '../../../shared/enums';
import { createdAt, id, updatedAt } from './columns';
import { users } from './users';

export const accounts = sqliteTable('accounts', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { enum: enumValues(ACCOUNT_TYPES) }).notNull(),
  accountProvider: text('account_provider'),
  // Texto para preservar a precisão decimal (espelha `balance: decimalSchema`).
  balance: text('balance').notNull().default('0'),
  currency: text('currency').notNull().default('BRL'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  description: text('description'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
