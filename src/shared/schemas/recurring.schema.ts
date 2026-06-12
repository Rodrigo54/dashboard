import { z } from 'zod';
import {
  RECURRING_FREQUENCIES,
  RECURRING_STATUSES,
  RECURRING_TYPES,
  TASK_PRIORITIES,
  TRANSACTION_CATEGORIES,
  TRANSACTION_TYPES,
} from '../enums';
import { guid, keysOf, positiveDecimalSchema, timestamps } from './common.schema';

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
  amount: positiveDecimalSchema,
  description: z.string(),
});

export const taskTemplateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(keysOf(TASK_PRIORITIES)).default('medium'),
  projectId: guid().optional(),
  estimatedHours: positiveDecimalSchema.optional(),
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
