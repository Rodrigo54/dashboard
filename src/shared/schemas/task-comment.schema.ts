import { z } from 'zod';
import { guid, timestamps } from './common.schema';

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
