import { z } from 'zod';
import { guid, timestamps } from './common.schema';

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
