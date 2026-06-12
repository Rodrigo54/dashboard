import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { enumValues, TRANSACTION_CATEGORIES, TRANSACTION_TYPES } from '../../../shared/enums';
import { accounts } from './accounts';
import { budgets } from './budgets';
import { createdAt, id, tagIds, updatedAt } from './columns';
import { goals } from './goals';
import { projects } from './projects';
import { recurring } from './recurring';
import { users } from './users';

export const transactions = sqliteTable('transactions', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  // Conta de destino em transações `transfer`; null caso contrário.
  toAccountId: text('to_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  type: text('type', { enum: enumValues(TRANSACTION_TYPES) }).notNull(),
  category: text('category', { enum: enumValues(TRANSACTION_CATEGORIES) }).notNull(),
  // Texto para preservar a precisão decimal (espelha `amount: positiveDecimalSchema`).
  amount: text('amount').notNull(),
  description: text('description').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  budgetId: text('budget_id').references(() => budgets.id, { onDelete: 'set null' }),
  goalId: text('goal_id').references(() => goals.id, { onDelete: 'set null' }),
  recurringId: text('recurring_id').references(() => recurring.id, { onDelete: 'set null' }),
  tags: tagIds(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
