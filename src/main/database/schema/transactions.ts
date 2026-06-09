import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { accounts } from './accounts.js';
import { createdAt, id, updatedAt } from './columns.js';
import { users } from './users.js';

export const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const;
export const TRANSACTION_CATEGORIES = [
  'housing', 'transport', 'food', 'health', 'education',
  'entertainment', 'shopping', 'salary', 'investment', 'transfer', 'other',
] as const;

export const transactions = sqliteTable('transactions', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  // Destination account for `transfer` transactions; null otherwise.
  transferAccountId: text('transfer_account_id').references(() => accounts.id, {
    onDelete: 'set null',
  }),
  type: text('type', { enum: TRANSACTION_TYPES }).notNull(),
  category: text('category', { enum: TRANSACTION_CATEGORIES }).notNull(),
  amount: real('amount').notNull(),
  description: text('description'),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
