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

/**
 * Opções de limpeza/exclusão de conta (ver AccountsController.delete). O
 * refine garante que ao menos uma ação foi selecionada — o modal já trava o
 * botão de confirmar nesse caso, mas o backend não confia só na UI.
 */
export const accountPurgeOptionsSchema = z
  .object({
    deleteTransactions: z.boolean(),
    deleteRecurring: z.boolean(),
    zeroBalance: z.boolean(),
    deleteAccount: z.boolean(),
  })
  .refine(
    (options) =>
      options.deleteTransactions ||
      options.deleteRecurring ||
      options.zeroBalance ||
      options.deleteAccount,
    { message: 'Selecione ao menos uma ação' },
  );
