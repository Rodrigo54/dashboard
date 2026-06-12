import { z } from 'zod';
import { BUDGET_PERIODS, TRANSACTION_CATEGORIES } from '../enums';
import {
  guid,
  keysOf,
  nonNegativeDecimalSchema,
  positiveDecimalSchema,
  timestamps,
} from './common.schema';

export const budgetSchema = z.object({
  id: guid(),
  userId: guid(),
  projectId: guid().nullish(),
  goalId: guid().nullish(),
  name: z.string().min(1).max(255),
  category: z.enum(keysOf(TRANSACTION_CATEGORIES)),
  amount: positiveDecimalSchema,
  spent: nonNegativeDecimalSchema,
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
  amount: positiveDecimalSchema,
  period: z.enum(keysOf(BUDGET_PERIODS)),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const updateBudgetSchema = createBudgetSchema.partial();
