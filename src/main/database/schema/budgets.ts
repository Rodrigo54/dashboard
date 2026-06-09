import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { BUDGET_PERIODS, enumValues, TRANSACTION_CATEGORIES } from '../../../shared/enums';
import { createdAt, id, updatedAt } from './columns';
import { goals } from './goals';
import { projects } from './projects';
import { users } from './users';

export const budgets = sqliteTable('budgets', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  goalId: text('goal_id').references(() => goals.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  category: text('category', { enum: enumValues(TRANSACTION_CATEGORIES) }).notNull(),
  amount: real('amount').notNull(),
  spent: real('spent').notNull().default(0),
  period: text('period', { enum: enumValues(BUDGET_PERIODS) }).notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
