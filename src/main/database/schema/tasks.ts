import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { enumValues, TASK_PRIORITIES, TASK_STATUSES } from '../../../shared/enums';
import { createdAt, id, tagIds, updatedAt } from './columns';
import { projects } from './projects';
import { recurring } from './recurring';
import { users } from './users';

export const tasks = sqliteTable('tasks', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  recurringId: text('recurring_id').references(() => recurring.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: enumValues(TASK_STATUSES) }).notNull().default('pending'),
  priority: text('priority', { enum: enumValues(TASK_PRIORITIES) }).notNull().default('medium'),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  estimatedHours: real('estimated_hours'),
  actualHours: real('actual_hours'),
  tags: tagIds(),
  // Ordenação manual num quadro/coluna (coluna `sort_order` evita palavra reservada).
  order: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
