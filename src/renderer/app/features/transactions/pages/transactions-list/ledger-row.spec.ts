import type { Recurring, Transaction } from '@shared/types';
import { describe, expect, it } from 'vitest';
import { byDateThenForecast, transactionToRow, type LedgerRow } from './ledger-row';

function recurringFixture(overrides: Partial<Recurring> = {}): Recurring {
  return {
    id: 'rule-1',
    userId: 'user-1',
    type: 'transaction',
    name: '1º Parcela do Salário',
    description: null,
    template: {
      accountId: 'acc-1',
      type: 'income',
      category: 'salary',
      amount: '3844.08',
      description: 'PAGTO SALARIO',
    },
    recurringPattern: {
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 6,
      businessDaysOnly: false,
      timezone: 'America/Sao_Paulo',
    },
    startDate: new Date('2026-06-06'),
    endDate: null,
    nextDate: new Date('2026-08-06'),
    status: 'active',
    source: 'manual',
    autoMaterialize: true,
    executionCount: 2,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as Recurring;
}

function transactionFixture(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't-1',
    userId: 'user-1',
    accountId: 'acc-1',
    toAccountId: null,
    type: 'expense',
    category: 'housing',
    amount: '1500.00',
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

function ledgerRowFixture(overrides: Partial<LedgerRow> = {}): LedgerRow {
  return {
    kind: 'transaction',
    key: 't:1',
    date: new Date('2026-07-05'),
    description: 'Aluguel',
    accountId: 'acc-1',
    type: 'expense',
    category: 'housing',
    amount: '1500.00',
    recurring: false,
    ...overrides,
  };
}

describe('transactionToRow', () => {
  it('mapeia os campos da transação pro row unificado', () => {
    const transaction = transactionFixture();
    expect(transactionToRow(transaction)).toMatchObject({
      kind: 'transaction',
      key: 't:t-1',
      description: 'Aluguel',
      accountId: 'acc-1',
      type: 'expense',
      category: 'housing',
      amount: '1500.00',
      recurring: false,
      transaction,
    });
  });

  it('marca recurring true quando a transação veio de uma regra', () => {
    const transaction = transactionFixture({ recurringId: 'rule-1' });
    expect(transactionToRow(transaction).recurring).toBe(true);
  });

  it('mostra o nome da regra vinculada em vez da descrição da transação', () => {
    const transaction = transactionFixture({
      description: 'PAGTO SALARIO',
      recurringId: 'rule-1',
    });
    const row = transactionToRow(transaction, [recurringFixture()]);
    expect(row.description).toBe('1º Parcela do Salário');
  });

  it('sem regra correspondente na lista, mantém a descrição original da transação', () => {
    const transaction = transactionFixture({
      description: 'PAGTO SALARIO',
      recurringId: 'rule-inexistente',
    });
    const row = transactionToRow(transaction, [recurringFixture()]);
    expect(row.description).toBe('PAGTO SALARIO');
  });

  it('sem vínculo, ignora as regras passadas e mantém a descrição própria', () => {
    const transaction = transactionFixture({ description: 'Mercado', recurringId: null });
    const row = transactionToRow(transaction, [recurringFixture()]);
    expect(row.description).toBe('Mercado');
  });
});

describe('byDateThenForecast', () => {
  it('ordena por data ascendente', () => {
    const earlier = ledgerRowFixture({ key: 'a', date: new Date('2026-07-01') });
    const later = ledgerRowFixture({ key: 'b', date: new Date('2026-07-15') });
    expect(byDateThenForecast(earlier, later)).toBeLessThan(0);
    expect(byDateThenForecast(later, earlier)).toBeGreaterThan(0);
  });

  it('em caso de empate, manda a previsão para depois da real', () => {
    const date = new Date('2026-07-05');
    const real = ledgerRowFixture({ key: 'real', date, kind: 'transaction' });
    const forecast = ledgerRowFixture({ key: 'forecast', date, kind: 'forecast' });
    expect(byDateThenForecast(forecast, real)).toBeGreaterThan(0);
    expect(byDateThenForecast(real, forecast)).toBeLessThan(0);
  });

  it('em caso de empate com o mesmo kind, considera igual', () => {
    const date = new Date('2026-07-05');
    const a = ledgerRowFixture({ key: 'a', date });
    const b = ledgerRowFixture({ key: 'b', date });
    expect(byDateThenForecast(a, b)).toBe(0);
  });
});
