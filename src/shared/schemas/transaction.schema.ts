import { z } from 'zod';
import { TRANSACTION_CATEGORIES, TRANSACTION_TYPES } from '../enums';
import { guid, keysOf, positiveDecimalSchema, timestamps } from './common.schema';

export const transactionSchema = z.object({
  id: guid(),
  userId: guid(),
  accountId: guid(),
  toAccountId: guid().nullish(),
  type: z.enum(keysOf(TRANSACTION_TYPES)),
  category: z.enum(keysOf(TRANSACTION_CATEGORIES)),
  amount: positiveDecimalSchema,
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
  amount: positiveDecimalSchema,
  description: z.string().min(1),
  date: z.coerce.date(),
  projectId: guid().optional(),
  budgetId: guid().optional(),
  goalId: guid().optional(),
  tags: z.array(z.guid()).default([]),
});

export const updateTransactionSchema = createTransactionSchema.partial();
