import { z } from 'zod';
import { TRANSACTION_CATEGORIES, TRANSACTION_TYPES } from '../enums';
import { guid, keysOf, positiveDecimalSchema } from './common.schema';

// ============================================================
// Importação de extratos (PDF -> transações)
// ============================================================

/** Entrada de `import:preview` — bytes do PDF + nome do arquivo original. */
export const importPreviewSchema = z.object({
  fileName: z.string().min(1),
  // Estruturado-clonável pela ponte de IPC (contextBridge).
  data: z.instanceof(Uint8Array),
  // Dica opcional: conta que o usuário abriu ao iniciar a importação.
  accountHintId: guid().optional(),
});

/**
 * Um item finalizado pelo usuário no staging, enviado ao `import:commit`. O
 * main revalida cada item, rededuplica e insere; o auto-link com recorrências
 * (`recurrence-auto-link.utils.ts`) é recalculado no commit, não confiado do
 * cliente — por isso este payload não carrega `recurringId`.
 */
export const importCommitItemSchema = z.object({
  accountId: guid(),
  type: z.enum(keysOf(TRANSACTION_TYPES)),
  category: z.enum(keysOf(TRANSACTION_CATEGORIES)),
  amount: positiveDecimalSchema,
  description: z.string().min(1),
  date: z.coerce.date(),
  fingerprint: z.string().min(1),
});

export const importCommitSchema = z.object({
  items: z.array(importCommitItemSchema),
});
