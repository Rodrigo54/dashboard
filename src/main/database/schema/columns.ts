import { sql } from 'drizzle-orm';
import { integer, text } from 'drizzle-orm/sqlite-core';
import { v7 as uuidV7 } from 'uuid';

// Shared column builders. These are imported by every entity file, so keep
// them free of table references to avoid import cycles.

export const id = () => text('id').primaryKey().$defaultFn(() => uuidV7());

export const createdAt = () =>
  integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`);

export const updatedAt = () =>
  integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date());

// Array de IDs de tags armazenado como JSON (espelha `tags: z.array(z.guid())`
// nos schemas zod). Default em runtime para evitar default literal no DDL.
export const tagIds = () =>
  text('tags', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .$defaultFn(() => []);
