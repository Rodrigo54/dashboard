import { z } from 'zod';
import { TASK_PRIORITIES, TASK_STATUSES } from '../enums';
import { guid, keysOf, positiveDecimalSchema, timestamps } from './common.schema';

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
  estimatedHours: positiveDecimalSchema.nullish(),
  actualHours: positiveDecimalSchema.nullish(),
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
  estimatedHours: positiveDecimalSchema.optional(),
  tags: z.array(z.guid()).default([]),
});

export const updateTaskSchema = createTaskSchema.partial();
