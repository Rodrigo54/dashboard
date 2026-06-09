import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createdAt, id, updatedAt } from './columns.js';
import { users } from './users.js';

export const RECURRING_TYPES = ['transaction', 'task'] as const;
export const RECURRING_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const;
export const RECURRING_STATUSES = ['active', 'paused', 'completed', 'cancelled'] as const;

export interface RecurringPayload {
  // Template applied on each run; shape depends on `type`.
  [key: string]: unknown;
}

export const recurring = sqliteTable('recurring', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: RECURRING_TYPES }).notNull(),
  status: text('status', { enum: RECURRING_STATUSES }).notNull().default('active'),
  name: text('name').notNull(),
  frequency: text('frequency', { enum: RECURRING_FREQUENCIES }).notNull(),
  intervalCount: integer('interval_count').notNull().default(1),
  nextRunAt: integer('next_run_at', { mode: 'timestamp' }).notNull(),
  lastRunAt: integer('last_run_at', { mode: 'timestamp' }),
  // Template used to materialize each occurrence (transaction or task).
  payload: text('payload', { mode: 'json' }).$type<RecurringPayload>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Recurring = typeof recurring.$inferSelect;
export type NewRecurring = typeof recurring.$inferInsert;
