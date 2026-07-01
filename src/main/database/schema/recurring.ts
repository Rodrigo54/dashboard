import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import {
  enumValues,
  RECURRING_SOURCES,
  RECURRING_STATUSES,
  RECURRING_TYPES,
} from '../../../shared/enums';
import type { RecurringPattern, TaskTemplate, TransactionTemplate } from '../../../shared/types';
import { createdAt, id, updatedAt } from './columns';
import { users } from './users';

export const recurring = sqliteTable('recurring', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: enumValues(RECURRING_TYPES) }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  // Template materializado a cada execução (transação ou tarefa).
  template: text('template', { mode: 'json' })
    .$type<TransactionTemplate | TaskTemplate>()
    .notNull(),
  recurringPattern: text('recurring_pattern', { mode: 'json' }).$type<RecurringPattern>().notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }),
  nextDate: integer('next_date', { mode: 'timestamp' }),
  status: text('status', { enum: enumValues(RECURRING_STATUSES) })
    .notNull()
    .default('active'),
  // Origem da regra (ver RECURRING_SOURCES). `imported` sinaliza que a regra veio
  // da detecção sobre extratos.
  source: text('source', { enum: enumValues(RECURRING_SOURCES) })
    .notNull()
    .default('manual'),
  // Se false, o materializador ignora a regra (sem lançamentos automáticos); as
  // ocorrências reais chegam pela importação. Regras `imported` usam false.
  autoMaterialize: integer('auto_materialize', { mode: 'boolean' }).notNull().default(true),
  executionCount: integer('execution_count').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Recurring = typeof recurring.$inferSelect;
export type NewRecurring = typeof recurring.$inferInsert;
