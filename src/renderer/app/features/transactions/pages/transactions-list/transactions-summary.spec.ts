import type { Transaction } from '@shared/types';
import { describe, expect, it } from 'vitest';
import { monthSummary } from './transactions-summary';

function transactionFixture(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't-1',
    userId: 'user-1',
    accountId: 'acc-1',
    toAccountId: null,
    type: 'expense',
    category: 'housing',
    amount: '100.00',
    description: 'Aluguel',
    date: new Date('2026-07-05'),
    projectId: null,
    budgetId: null,
    goalId: null,
    recurringId: null,
    importFingerprint: null,
    tags: [],
    createdAt: new Date('2026-07-05'),
    updatedAt: new Date('2026-07-05'),
    ...overrides,
  } as Transaction;
}

describe('monthSummary', () => {
  it('soma receitas e despesas separadamente e calcula o saldo', () => {
    const transactions = [
      transactionFixture({ type: 'income', amount: '3844.08' }),
      transactionFixture({ type: 'expense', amount: '1500.00' }),
      transactionFixture({ type: 'expense', amount: '250.50' }),
    ];
    expect(monthSummary(transactions)).toEqual({
      income: '3844.08',
      expense: '1750.50',
      balance: '2093.58',
    });
  });

  it('sem transações, devolve zeros', () => {
    expect(monthSummary([])).toEqual({ income: '0.00', expense: '0.00', balance: '0.00' });
  });

  it('saldo negativo quando despesas superam receitas', () => {
    const transactions = [
      transactionFixture({ type: 'income', amount: '100.00' }),
      transactionFixture({ type: 'expense', amount: '400.00' }),
    ];
    expect(monthSummary(transactions).balance).toBe('-300.00');
  });
});
