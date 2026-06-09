import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createdAt, id, updatedAt } from './columns.js';
import { projects } from './projects.js';
import { users } from './users.js';

export const goals = sqliteTable('goals', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  description: text('description'),
  targetAmount: real('target_amount').notNull(),
  currentAmount: real('current_amount').notNull().default(0),
  targetDate: integer('target_date', { mode: 'timestamp' }),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
