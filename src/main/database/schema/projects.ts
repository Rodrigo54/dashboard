import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { enumValues, PROJECT_STATUSES, TASK_PRIORITIES } from '../../../shared/enums';
import { createdAt, id, tagIds, updatedAt } from './columns';
import { users } from './users';

export const projects = sqliteTable('projects', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', { enum: enumValues(PROJECT_STATUSES) }).notNull().default('planning'),
  priority: text('priority', { enum: enumValues(TASK_PRIORITIES) }).notNull().default('medium'),
  startDate: integer('start_date', { mode: 'timestamp' }),
  endDate: integer('end_date', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  progress: integer('progress').notNull().default(0),
  color: text('color'),
  tags: tagIds(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
