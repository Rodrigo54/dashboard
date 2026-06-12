import { z } from 'zod';
import { TAG_TYPES } from '../enums';
import { guid, keysOf, timestamps } from './common.schema';

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
