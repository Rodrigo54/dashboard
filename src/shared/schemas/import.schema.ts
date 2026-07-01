import { z } from 'zod';
import { TRANSACTION_CATEGORIES, TRANSACTION_TYPES } from '../enums';
import { guid, keysOf, positiveDecimalSchema } from './common.schema';
import { recurringPatternSchema, transactionTemplateSchema } from './recurring.schema';

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
 * main revalida cada item, rededuplica e então insere (linha nova) ou reconcilia
 * a linha materializada indicada por `reconcileTransactionId` (update in-place).
 */
export const importCommitItemSchema = z.object({
  accountId: guid(),
  type: z.enum(keysOf(TRANSACTION_TYPES)),
  category: z.enum(keysOf(TRANSACTION_CATEGORIES)),
  amount: positiveDecimalSchema,
  description: z.string().min(1),
  date: z.coerce.date(),
  fingerprint: z.string().min(1),
  // Recorrência existente à qual esta linha pertence (matching confirmado).
  recurringId: guid().nullish(),
  // Ocorrência já materializada que esta linha deve reconciliar (update in-place).
  reconcileTransactionId: guid().nullish(),
});

export const importCommitSchema = z.object({
  items: z.array(importCommitItemSchema),
});

/**
 * Confirmação de uma recorrência detectada: cria a regra (source `imported`,
 * sem auto-materialização) e vincula retroativamente as transações que a
 * originaram (`transactionIds`).
 */
export const confirmDetectedRecurrenceSchema = z.object({
  name: z.string().min(1).max(255),
  template: transactionTemplateSchema,
  recurringPattern: recurringPatternSchema,
  startDate: z.coerce.date(),
  transactionIds: z.array(guid()).default([]),
});
