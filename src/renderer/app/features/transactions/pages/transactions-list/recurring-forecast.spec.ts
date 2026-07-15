import type { Recurring, Transaction } from '@shared/types';
import { describe, expect, it } from 'vitest';
import { forecastRows, type ForecastFilter } from './recurring-forecast';

/**
 * `nextOccurrence`/`addMonthsClamped` trabalham em horário local — datas de
 * fixture usam o construtor local (`new Date(y, m, d)`), nunca string ISO
 * (`new Date('2026-01-05')` é UTC-meia-noite e desloca de dia em fusos
 * negativos como America/Sao_Paulo).
 */
function localDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

/** Compara pela data local (não `.toISOString()`, que reintroduziria o fuso). */
function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function recurringFixture(overrides: Partial<Recurring> = {}): Recurring {
  return {
    id: 'rule-1',
    userId: 'user-1',
    type: 'transaction',
    name: 'Aluguel',
    description: null,
    template: {
      accountId: 'acc-1',
      type: 'expense',
      category: 'housing',
      amount: '1500.00',
      description: 'Aluguel mensal',
    },
    recurringPattern: {
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 5,
      businessDaysOnly: false,
      timezone: 'America/Sao_Paulo',
    },
    startDate: localDate(2026, 1, 5),
    endDate: null,
    nextDate: null,
    status: 'active',
    source: 'manual',
    autoMaterialize: true,
    executionCount: 0,
    createdAt: localDate(2026, 1, 1),
    updatedAt: localDate(2026, 1, 1),
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
    description: 'Aluguel mensal',
    date: localDate(2026, 7, 5),
    projectId: null,
    budgetId: null,
    goalId: null,
    recurringId: null,
    importFingerprint: null,
    tags: [],
    createdAt: localDate(2026, 7, 5),
    updatedAt: localDate(2026, 7, 5),
    ...overrides,
  } as Transaction;
}

const julyFilter: ForecastFilter = { year: 2026, month: 7 };

describe('forecastRows — ocorrências dentro do mês', () => {
  it('gera uma ocorrência mensal dentro do mês exibido', () => {
    const rule = recurringFixture();
    const rows = forecastRows([rule], [], julyFilter);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: 'forecast',
      key: expect.stringContaining('rule-1'),
      description: 'Aluguel',
      accountId: 'acc-1',
      type: 'expense',
      category: 'housing',
      amount: '1500.00',
      recurring: true,
      ruleStatus: 'active',
    });
    expect(localDateString(rows[0].date)).toBe('2026-07-05');
  });

  it('gera múltiplas ocorrências semanais dentro do mês', () => {
    const rule = recurringFixture({
      recurringPattern: {
        frequency: 'weekly',
        interval: 1,
        businessDaysOnly: false,
        timezone: 'America/Sao_Paulo',
      },
      startDate: localDate(2026, 6, 24),
    });
    const rows = forecastRows([rule], [], julyFilter);
    expect(rows.map((r) => localDateString(r.date))).toEqual([
      '2026-07-01',
      '2026-07-08',
      '2026-07-15',
      '2026-07-22',
      '2026-07-29',
    ]);
  });

  it('não gera ocorrência quando a regra começa depois do mês exibido', () => {
    const rule = recurringFixture({ startDate: localDate(2026, 8, 1) });
    expect(forecastRows([rule], [], julyFilter)).toEqual([]);
  });

  it('corta as ocorrências na data de término (endDate) dentro do mês', () => {
    const rule = recurringFixture({
      recurringPattern: {
        frequency: 'weekly',
        interval: 1,
        businessDaysOnly: false,
        timezone: 'America/Sao_Paulo',
      },
      startDate: localDate(2026, 6, 24),
      endDate: localDate(2026, 7, 10),
    });
    const rows = forecastRows([rule], [], julyFilter);
    expect(rows.map((r) => localDateString(r.date))).toEqual(['2026-07-01', '2026-07-08']);
  });
});

describe('forecastRows — exclusões', () => {
  it('pula a ocorrência já materializada em uma transação real', () => {
    const rule = recurringFixture();
    const materialized = transactionFixture({
      recurringId: 'rule-1',
      date: localDate(2026, 7, 5),
    });
    expect(forecastRows([rule], [materialized], julyFilter)).toEqual([]);
  });

  it('inclui a regra pausada com ruleStatus paused', () => {
    const rule = recurringFixture({ status: 'paused' });
    const rows = forecastRows([rule], [], julyFilter);
    expect(rows).toHaveLength(1);
    expect(rows[0].ruleStatus).toBe('paused');
  });

  it('exclui a regra concluída (completed)', () => {
    const rule = recurringFixture({ status: 'completed' });
    expect(forecastRows([rule], [], julyFilter)).toEqual([]);
  });

  it('exclui regras de outra conta quando o filtro de conta está ativo', () => {
    const rule = recurringFixture();
    expect(forecastRows([rule], [], { ...julyFilter, accountId: 'acc-2' })).toEqual([]);
  });

  it('exclui regras de outro tipo quando o filtro de tipo está ativo', () => {
    const rule = recurringFixture();
    expect(forecastRows([rule], [], { ...julyFilter, type: 'income' })).toEqual([]);
  });
});
