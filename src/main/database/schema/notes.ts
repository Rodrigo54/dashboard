import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createdAt, id, updatedAt } from './columns.js';
import { users } from './users.js';

// Backs the notes:list / notes:create IPC channels.
export const notes = sqliteTable('notes', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
