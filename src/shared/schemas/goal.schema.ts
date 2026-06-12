import { z } from 'zod';
import { guid, nonNegativeDecimalSchema, positiveDecimalSchema, timestamps } from './common.schema';

export const goalSchema = z.object({
  id: guid(),
  userId: guid(),
  projectId: guid().nullish(),
  name: z.string().min(1).max(255),
  description: z.string().nullish(),
  targetAmount: positiveDecimalSchema,
  currentAmount: nonNegativeDecimalSchema,
  targetDate: z.coerce.date().nullish(),
  isCompleted: z.boolean(),
  ...timestamps,
});

export const createGoalSchema = z.object({
  projectId: guid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  targetAmount: positiveDecimalSchema,
  targetDate: z.coerce.date().optional(),
});

export const updateGoalSchema = createGoalSchema.partial();
