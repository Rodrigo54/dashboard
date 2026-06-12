import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createdAt, id, updatedAt } from './columns';
import { projects } from './projects';
import { users } from './users';

export const goals = sqliteTable('goals', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  description: text('description'),
  // Texto para preservar a precisão decimal (espelha os schemas zod de decimal).
  targetAmount: text('target_amount').notNull(),
  currentAmount: text('current_amount').notNull().default('0'),
  targetDate: integer('target_date', { mode: 'timestamp' }),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
