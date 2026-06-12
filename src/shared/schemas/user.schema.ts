import { z } from 'zod';
import { USER_ROLES } from '../enums';
import { guid, keysOf, timestamps } from './common.schema';

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
