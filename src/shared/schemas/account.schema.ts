import { z } from 'zod';
import { ACCOUNT_TYPES } from '../enums';
import { decimalSchema, guid, keysOf, timestamps } from './common.schema';

export const accountSchema = z.object({
  id: guid(),
  userId: guid(),
  name: z.string().min(1).max(255),
  type: z.enum(keysOf(ACCOUNT_TYPES)),
  accountProvider: z.string().max(255).nullish(),
  balance: decimalSchema.default('0'),
  currency: z.string().length(3).default('BRL'),
  isActive: z.boolean(),
  description: z.string().nullish(),
  ...timestamps,
});

export const createAccountSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(keysOf(ACCOUNT_TYPES)),
  accountProvider: z.string().max(255).optional(),
  balance: decimalSchema.default('0'),
  currency: z.string().length(3).default('BRL'),
  description: z.string().optional(),
});

export const updateAccountSchema = createAccountSchema.partial();
