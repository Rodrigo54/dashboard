import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { accounts } from './accounts.js';
import { createdAt, id, updatedAt } from './columns.js';
import { users } from './users.js';

export const goals = sqliteTable('goals', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  targetAmount: real('target_amount').notNull(),
  currentAmount: real('current_amount').notNull().default(0),
  deadline: integer('deadline', { mode: 'timestamp' }),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
