import type { TransactionType } from '@shared/enums';
import type { Recurring, Transaction } from '@shared/types';

/**
 * Linha unificada do extrato. Transações reais e previsões de recorrência
 * compartilham o mesmo formato visual — a `kind` decide o tratamento (a linha
 * de previsão é renderizada como uma transação "fantasma").
 */
export type LedgerKind = 'transaction' | 'forecast';

export interface LedgerRow {
  readonly kind: LedgerKind;
  /** Chave estável para o `track` do `@for`. */
  readonly key: string;
  readonly date: Date;
  readonly description: string;
  readonly accountId: string;
  readonly type: TransactionType;
  readonly category: string;
  /** Valor positivo como string decimal (o sinal é derivado do `type`). */
  readonly amount: string;
  /** Linha real originada de uma regra (recebe o ícone de repetição). */
  readonly recurring: boolean;
  /** Presente apenas em linhas reais. */
  readonly transaction?: Transaction;
  /** Presente apenas em linhas de previsão. */
  readonly rule?: Recurring;
  readonly ruleStatus?: 'active' | 'paused';
}

/**
 * Mapeia uma transação persistida para uma linha do extrato. Vinculada a uma
 * regra, exibe o nome da regra em vez da descrição própria — mesmo rótulo
 * antes e depois de materializar, como a linha de previsão já mostra.
 */
export function transactionToRow(
  transaction: Transaction,
  rules: readonly Recurring[] = [],
): LedgerRow {
  const rule = transaction.recurringId
    ? rules.find((r) => r.id === transaction.recurringId)
    : undefined;

  return {
    kind: 'transaction',
    key: `t:${transaction.id}`,
    date: new Date(transaction.date),
    description: rule?.name ?? transaction.description,
    accountId: transaction.accountId,
    type: transaction.type,
    category: transaction.category,
    amount: transaction.amount,
    recurring: transaction.recurringId != null,
    transaction,
  };
}

/** Ordena por data ascendente, com as previsões depois das reais no empate. */
export function byDateThenForecast(a: LedgerRow, b: LedgerRow): number {
  const delta = a.date.getTime() - b.date.getTime();
  if (delta !== 0) return delta;
  if (a.kind === b.kind) return 0;
  return a.kind === 'forecast' ? 1 : -1;
}
