import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createdAt, id, updatedAt } from './columns.js';
import { users } from './users.js';

export const ACCOUNT_TYPES = ['checking', 'savings', 'credit', 'investment', 'cash'] as const;

export const accounts = sqliteTable('accounts', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { enum: ACCOUNT_TYPES }).notNull(),
  balance: real('balance').notNull().default(0),
  currency: text('currency').notNull().default('BRL'),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
