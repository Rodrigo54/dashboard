import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { enumValues, USER_ROLES } from '../../../shared/enums';
import { createdAt, id, updatedAt } from './columns.js';

export const users = sqliteTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  // Credencial armazenada — intencionalmente ausente do `userSchema` público (zod).
  passwordHash: text('password_hash').notNull(),
  avatar: text('avatar'),
  role: text('role', { enum: enumValues(USER_ROLES) }).notNull().default('user'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
