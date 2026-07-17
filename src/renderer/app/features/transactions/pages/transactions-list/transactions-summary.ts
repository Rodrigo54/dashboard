import { addDecimal, subtractDecimal } from '@shared/decimal';
import type { Transaction } from '@shared/types';

export interface MonthSummary {
  readonly income: string;
  readonly expense: string;
  readonly balance: string;
}

/**
 * Totais do mês exibido a partir de transações reais — previsões de
 * recorrência não entram na conta (são possibilidade, não fato consumado).
 */
export function monthSummary(transactions: readonly Transaction[]): MonthSummary {
  let income = '0.00';
  let expense = '0.00';

  for (const transaction of transactions) {
    if (transaction.type === 'income') income = addDecimal(income, transaction.amount);
    else if (transaction.type === 'expense') expense = addDecimal(expense, transaction.amount);
  }

  return { income, expense, balance: subtractDecimal(income, expense) };
}
