import { defineRelations, sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { v7 as uuidV7 } from 'uuid';

// Tables live here. drizzle-kit reads this file to generate migrations,
// so keep it free of Electron/Node-runtime imports.

// ── Enums (inline; no @dashboard/shared dependency) ───────────
export const ACCOUNT_TYPES = ['checking', 'savings', 'credit', 'investment', 'cash'] as const;
export const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const;
export const TRANSACTION_CATEGORIES = [
  'housing', 'transport', 'food', 'health', 'education',
  'entertainment', 'shopping', 'salary', 'investment', 'transfer', 'other',
] as const;
export const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'cancelled'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const TASK_STATUSES = ['new_request', 'in_progress', 'in_review', 'done', 'cancelled'] as const;
export const RECURRING_TYPES = ['transaction', 'task'] as const;
export const RECURRING_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const;
export const RECURRING_STATUSES = ['active', 'paused', 'completed', 'cancelled'] as const;
export const USER_ROLES = ['admin', 'user'] as const;

// ── Shared column helpers ─────────────────────────────────────
const id = () => text('id').primaryKey().$defaultFn(() => uuidV7());
const createdAt = () =>
  integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`);
const updatedAt = () =>
  integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date());

// ── users ─────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: USER_ROLES }).notNull().default('user'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ── accounts ──────────────────────────────────────────────────
export const accounts = sqliteTable('accounts', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { enum: ACCOUNT_TYPES }).notNull(),
  balance: real('balance').notNull().default(0),
  currency: text('currency').notNull().default('BRL'),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ── transactions ──────────────────────────────────────────────
export const transactions = sqliteTable('transactions', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  // Destination account for `transfer` transactions; null otherwise.
  transferAccountId: text('transfer_account_id').references(() => accounts.id, {
    onDelete: 'set null',
  }),
  type: text('type', { enum: TRANSACTION_TYPES }).notNull(),
  category: text('category', { enum: TRANSACTION_CATEGORIES }).notNull(),
  amount: real('amount').notNull(),
  description: text('description'),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ── budgets ───────────────────────────────────────────────────
export const budgets = sqliteTable('budgets', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  category: text('category', { enum: TRANSACTION_CATEGORIES }).notNull(),
  amount: real('amount').notNull(),
  spent: real('spent').notNull().default(0),
  // Budget period as 'YYYY-MM'.
  month: text('month').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ── goals ─────────────────────────────────────────────────────
export const goals = sqliteTable('goals', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  targetAmount: real('target_amount').notNull(),
  currentAmount: real('current_amount').notNull().default(0),
  deadline: integer('deadline', { mode: 'timestamp' }),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ── projects ──────────────────────────────────────────────────
export const projects = sqliteTable('projects', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', { enum: PROJECT_STATUSES }).notNull().default('planning'),
  color: text('color'),
  startDate: integer('start_date', { mode: 'timestamp' }),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ── tasks ─────────────────────────────────────────────────────
export const tasks = sqliteTable('tasks', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: TASK_STATUSES }).notNull().default('new_request'),
  priority: text('priority', { enum: TASK_PRIORITIES }).notNull().default('medium'),
  // Manual ordering within a column/board.
  position: integer('position').notNull().default(0),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ── task_comments ─────────────────────────────────────────────
export const taskComments = sqliteTable('task_comments', {
  id: id(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ── tags ──────────────────────────────────────────────────────
export const tags = sqliteTable('tags', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color'),
  createdAt: createdAt(),
});

// ── recurring ─────────────────────────────────────────────────
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

// ── notes (existing; backs notes:list / notes:create IPC) ─────
export const notes = sqliteTable('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── Relations (Relational Queries v2 — single defineRelations) ─
export const relations = defineRelations(
  { users, accounts, transactions, budgets, goals, projects, tasks, taskComments, tags, recurring, notes },
  (r) => ({
    users: {
      accounts: r.many.accounts(),
      transactions: r.many.transactions(),
      budgets: r.many.budgets(),
      goals: r.many.goals(),
      projects: r.many.projects(),
      tasks: r.many.tasks(),
      taskComments: r.many.taskComments(),
      tags: r.many.tags(),
      recurring: r.many.recurring(),
    },
    accounts: {
      user: r.one.users({ from: r.accounts.userId, to: r.users.id, optional: false }),
      transactions: r.many.transactions({ alias: 'account' }),
      goals: r.many.goals(),
    },
    transactions: {
      user: r.one.users({ from: r.transactions.userId, to: r.users.id, optional: false }),
      account: r.one.accounts({
        from: r.transactions.accountId,
        to: r.accounts.id,
        optional: false,
        alias: 'account',
      }),
      transferAccount: r.one.accounts({
        from: r.transactions.transferAccountId,
        to: r.accounts.id,
        alias: 'transferAccount',
      }),
    },
    budgets: {
      user: r.one.users({ from: r.budgets.userId, to: r.users.id, optional: false }),
    },
    goals: {
      user: r.one.users({ from: r.goals.userId, to: r.users.id, optional: false }),
      account: r.one.accounts({ from: r.goals.accountId, to: r.accounts.id }),
    },
    projects: {
      user: r.one.users({ from: r.projects.userId, to: r.users.id, optional: false }),
      tasks: r.many.tasks(),
    },
    tasks: {
      user: r.one.users({ from: r.tasks.userId, to: r.users.id, optional: false }),
      project: r.one.projects({ from: r.tasks.projectId, to: r.projects.id }),
      comments: r.many.taskComments(),
    },
    taskComments: {
      task: r.one.tasks({ from: r.taskComments.taskId, to: r.tasks.id, optional: false }),
      user: r.one.users({ from: r.taskComments.userId, to: r.users.id, optional: false }),
    },
    tags: {
      user: r.one.users({ from: r.tags.userId, to: r.users.id, optional: false }),
    },
    recurring: {
      user: r.one.users({ from: r.recurring.userId, to: r.users.id, optional: false }),
    },
  }),
);

// ── Inferred types ────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskComment = typeof taskComments.$inferSelect;
export type NewTaskComment = typeof taskComments.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type Recurring = typeof recurring.$inferSelect;
export type NewRecurring = typeof recurring.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
