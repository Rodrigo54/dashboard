import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Tables live here. drizzle-kit reads this file to generate migrations,
// so keep it free of Electron/Node-runtime imports.
export const notes = sqliteTable('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
