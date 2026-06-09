import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createdAt, id } from './columns.js';
import { users } from './users.js';

export const tags = sqliteTable('tags', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color'),
  createdAt: createdAt(),
});

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
