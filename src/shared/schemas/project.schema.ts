import { z } from 'zod';
import { PROJECT_STATUSES, TASK_PRIORITIES } from '../enums';
import { guid, keysOf, timestamps } from './common.schema';

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
