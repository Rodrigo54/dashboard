import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { enumValues, TAG_TYPES } from '../../../shared/enums';
import { createdAt, id, updatedAt } from './columns.js';
import { users } from './users.js';

export const tags = sqliteTable('tags', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { enum: enumValues(TAG_TYPES) }).notNull(),
  color: text('color'),
  icon: text('icon'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
