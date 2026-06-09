import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createdAt, id, updatedAt } from './columns.js';
import { projects } from './projects.js';
import { users } from './users.js';

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const TASK_STATUSES = ['new_request', 'in_progress', 'in_review', 'done', 'cancelled'] as const;

export const tasks = sqliteTable('tasks', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: TASK_STATUSES }).notNull().default('new_request'),
  priority: text('priority', { enum: TASK_PRIORITIES }).notNull().default('medium'),
  // Manual ordering within a column/board.
  position: integer('position').notNull().default(0),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// Co-located with tasks: a comment always belongs to exactly one task.
export const taskComments = sqliteTable('task_comments', {
  id: id(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskComment = typeof taskComments.$inferSelect;
export type NewTaskComment = typeof taskComments.$inferInsert;
