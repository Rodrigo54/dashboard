import { real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createdAt, id, updatedAt } from './columns.js';
import { TRANSACTION_CATEGORIES } from './transactions.js';
import { users } from './users.js';

export const budgets = sqliteTable('budgets', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  category: text('category', { enum: TRANSACTION_CATEGORIES }).notNull(),
  amount: real('amount').notNull(),
  spent: real('spent').notNull().default(0),
  // Budget period as 'YYYY-MM'.
  month: text('month').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
