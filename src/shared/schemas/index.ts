export * from './environment.schema';

import { z } from 'zod';
import {
  ACCOUNT_TYPES,
  BUDGET_PERIODS,
  PROJECT_STATUSES,
  RECURRING_FREQUENCIES,
  RECURRING_STATUSES,
  RECURRING_TYPES,
  TAG_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TRANSACTION_CATEGORIES,
  TRANSACTION_TYPES,
  USER_ROLES,
} from '../enums';

// ============================================================
// Helpers
// ============================================================

function keysOf<T extends Record<string, unknown>>(obj: T) {
  return Object.keys(obj) as [keyof T & string, ...(keyof T & string)[]];
}

export const uuidSchema = z.uuid({ message: 'ID deve ser um UUID válido', version: 'v7' });
const guid = () => uuidSchema;

const timestamps = {
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
};

// ============================================================
// Users
// ============================================================

export const userSchema = z.object({
  id: guid(),
  email: z.email(),
  name: z.string().min(1).max(255),
  avatar: z.string().max(500).nullish(),
  role: z.enum(keysOf(USER_ROLES)),
  isActive: z.boolean(),
  ...timestamps,
});

export const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(255),
  name: z.string().min(1).max(255),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// ============================================================
// Accounts
// ============================================================

export const accountSchema = z.object({
  id: guid(),
  userId: guid(),
  name: z.string().min(1).max(255),
  type: z.enum(keysOf(ACCOUNT_TYPES)),
  accountProvider: z.string().max(255).nullish(),
  balance: z.string().default('0'),
  currency: z.string().length(3).default('BRL'),
  isActive: z.boolean(),
  description: z.string().nullish(),
  ...timestamps,
});

export const createAccountSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(keysOf(ACCOUNT_TYPES)),
  accountProvider: z.string().max(255).optional(),
  balance: z.string().default('0'),
  currency: z.string().length(3).default('BRL'),
  description: z.string().optional(),
});

export const updateAccountSchema = createAccountSchema.partial();

// ============================================================
// Transactions
// ============================================================

export const transactionSchema = z.object({
  id: guid(),
  userId: guid(),
  accountId: guid(),
  toAccountId: guid().nullish(),
  type: z.enum(keysOf(TRANSACTION_TYPES)),
  category: z.enum(keysOf(TRANSACTION_CATEGORIES)),
  amount: z.coerce.number().positive(),
  description: z.string(),
  date: z.coerce.date(),
  projectId: guid().nullish(),
  budgetId: guid().nullish(),
  goalId: guid().nullish(),
  recurringId: guid().nullish(),
  tags: z.array(z.guid()).default([]),
  ...timestamps,
});

export const createTransactionSchema = z.object({
  accountId: guid(),
  toAccountId: guid().optional(),
  type: z.enum(keysOf(TRANSACTION_TYPES)),
  category: z.enum(keysOf(TRANSACTION_CATEGORIES)),
  amount: z.coerce.number().positive(),
  description: z.string().min(1),
  date: z.coerce.date(),
  projectId: guid().optional(),
  budgetId: guid().optional(),
  goalId: guid().optional(),
  tags: z.array(z.guid()).default([]),
});

export const updateTransactionSchema = createTransactionSchema.partial();

// ============================================================
// Budgets
// ============================================================

export const budgetSchema = z.object({
  id: guid(),
  userId: guid(),
  projectId: guid().nullish(),
  goalId: guid().nullish(),
  name: z.string().min(1).max(255),
  category: z.enum(keysOf(TRANSACTION_CATEGORIES)),
  amount: z.coerce.number().positive(),
  spent: z.coerce.number(),
  period: z.enum(keysOf(BUDGET_PERIODS)),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  ...timestamps,
});

export const createBudgetSchema = z.object({
  projectId: guid().optional(),
  goalId: guid().optional(),
  name: z.string().min(1).max(255),
  category: z.enum(keysOf(TRANSACTION_CATEGORIES)),
  amount: z.coerce.number().positive(),
  period: z.enum(keysOf(BUDGET_PERIODS)),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const updateBudgetSchema = createBudgetSchema.partial();

// ============================================================
// Goals
// ============================================================

export const goalSchema = z.object({
  id: guid(),
  userId: guid(),
  projectId: guid().nullish(),
  name: z.string().min(1).max(255),
  description: z.string().nullish(),
  targetAmount: z.coerce.number().positive(),
  currentAmount: z.coerce.number(),
  targetDate: z.coerce.date().nullish(),
  isCompleted: z.boolean(),
  ...timestamps,
});

export const createGoalSchema = z.object({
  projectId: guid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  targetAmount: z.coerce.number().positive(),
  targetDate: z.coerce.date().optional(),
});

export const updateGoalSchema = createGoalSchema.partial();

// ============================================================
// Projects
// ============================================================

export const projectSchema = z.object({
  id: guid(),
  userId: guid(),
  name: z.string().min(1).max(255),
  description: z.string().nullish(),
  status: z.enum(keysOf(PROJECT_STATUSES)),
  priority: z.enum(keysOf(TASK_PRIORITIES)),
  startDate: z.coerce.date().nullish(),
  endDate: z.coerce.date().nullish(),
  completedAt: z.coerce.date().nullish(),
  progress: z.number().int().min(0).max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullish(),
  tags: z.array(z.guid()).default([]),
  ...timestamps,
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(keysOf(PROJECT_STATUSES)).default('planning'),
  priority: z.enum(keysOf(TASK_PRIORITIES)).default('medium'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  tags: z.array(z.guid()).default([]),
});

export const updateProjectSchema = createProjectSchema.partial();

// ============================================================
// Tasks
// ============================================================

export const taskSchema = z.object({
  id: guid(),
  userId: guid(),
  projectId: guid().nullish(),
  recurringId: guid().nullish(),
  title: z.string().min(1).max(255),
  description: z.string().nullish(),
  status: z.enum(keysOf(TASK_STATUSES)),
  priority: z.enum(keysOf(TASK_PRIORITIES)),
  dueDate: z.coerce.date().nullish(),
  completedAt: z.coerce.date().nullish(),
  estimatedHours: z.coerce.number().nullish(),
  actualHours: z.coerce.number().nullish(),
  tags: z.array(z.guid()).default([]),
  order: z.number().int(),
  ...timestamps,
});

export const createTaskSchema = z.object({
  projectId: guid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(keysOf(TASK_STATUSES)).default('pending'),
  priority: z.enum(keysOf(TASK_PRIORITIES)).default('medium'),
  dueDate: z.coerce.date().optional(),
  estimatedHours: z.coerce.number().positive().optional(),
  tags: z.array(z.guid()).default([]),
});

export const updateTaskSchema = createTaskSchema.partial();

// ============================================================
// Tags
// ============================================================

export const tagSchema = z.object({
  id: guid(),
  userId: guid(),
  name: z.string().min(1).max(100),
  type: z.enum(keysOf(TAG_TYPES)),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullish(),
  icon: z.string().max(50).nullish(),
  ...timestamps,
});

export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(keysOf(TAG_TYPES)),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  icon: z.string().max(50).optional(),
});

export const updateTagSchema = createTagSchema.partial();

// ============================================================
// Recurring
// ============================================================

export const recurringPatternSchema = z.object({
  frequency: z.enum(keysOf(RECURRING_FREQUENCIES)),
  interval: z.number().int().positive().default(1),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  businessDaysOnly: z.boolean().default(false),
  timezone: z.string().default('America/Sao_Paulo'),
});

export const transactionTemplateSchema = z.object({
  accountId: guid(),
  type: z.enum(keysOf(TRANSACTION_TYPES)),
  category: z.enum(keysOf(TRANSACTION_CATEGORIES)),
  amount: z.coerce.number().positive(),
  description: z.string(),
});

export const taskTemplateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(keysOf(TASK_PRIORITIES)).default('medium'),
  projectId: guid().optional(),
  estimatedHours: z.coerce.number().positive().optional(),
});

export const recurringSchema = z.object({
  id: guid(),
  userId: guid(),
  type: z.enum(keysOf(RECURRING_TYPES)),
  name: z.string().min(1).max(255),
  description: z.string().nullish(),
  template: z.union([transactionTemplateSchema, taskTemplateSchema]),
  recurringPattern: recurringPatternSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullish(),
  nextDate: z.coerce.date().nullish(),
  status: z.enum(keysOf(RECURRING_STATUSES)),
  executionCount: z.number().int(),
  ...timestamps,
});

export const createRecurringSchema = z.object({
  type: z.enum(keysOf(RECURRING_TYPES)),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  template: z.union([transactionTemplateSchema, taskTemplateSchema]),
  recurringPattern: recurringPatternSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

export const updateRecurringSchema = createRecurringSchema.partial();

// ============================================================
// Notes
// ============================================================

export const noteSchema = z.object({
  id: guid(),
  userId: guid(),
  title: z.string().min(1).max(255),
  body: z.string().default(''),
  ...timestamps,
});

export const createNoteSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().default(''),
});

export const updateNoteSchema = createNoteSchema.partial();

// ============================================================
// Task Comments
// ============================================================

export const taskCommentSchema = z.object({
  id: guid(),
  taskId: guid(),
  userId: guid(),
  body: z.string().min(1),
  ...timestamps,
});

export const createTaskCommentSchema = z.object({
  taskId: guid(),
  body: z.string().min(1),
});

export const updateTaskCommentSchema = createTaskCommentSchema.partial();

// ============================================================
// Shared / Common
// ============================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});
