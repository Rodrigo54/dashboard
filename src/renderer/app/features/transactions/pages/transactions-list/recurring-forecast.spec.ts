import type { Recurring, Transaction } from '@shared/types';
import { describe, expect, it } from 'vitest';
import { forecastRows, nextOccurrences, type ForecastFilter } from './recurring-forecast';

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

  it('não duplica a previsão quando a transação vinculada caiu em dia diferente do calculado e nextDate já avançou', () => {
    // Regressão: regra "1º Parcela do Salário" real — startDate/pattern
    // calculam dia 6, mas o matching vinculou uma transação de dia 5 (dentro
    // da tolerância de proximidade de data) e avançou nextDate para o mês
    // seguinte. Recalcular ocorrências a partir de startDate recriava um
    // "dia 6" fantasma que não batia com a transação real de dia 5.
    const rule = recurringFixture({
      startDate: localDate(2026, 6, 6),
      nextDate: localDate(2026, 8, 6),
      executionCount: 2,
    });
    const linked = transactionFixture({ recurringId: 'rule-1', date: localDate(2026, 6, 5) });
    const juneFilter: ForecastFilter = { year: 2026, month: 6 };
    expect(forecastRows([rule], [linked], juneFilter)).toEqual([]);
  });

  it('continua prevendo o mês corrente quando nextDate cai dentro dele', () => {
    const rule = recurringFixture({
      startDate: localDate(2026, 6, 6),
      nextDate: localDate(2026, 8, 6),
      executionCount: 2,
    });
    const rows = forecastRows([rule], [], { year: 2026, month: 8 });
    expect(rows.map((r) => localDateString(r.date))).toEqual(['2026-08-06']);
  });
});

describe('nextOccurrences', () => {
  it('retorna as próximas N ocorrências a partir de `from`, cruzando meses', () => {
    const rule = recurringFixture(); // mensal, dia 5, desde jan/2026
    const dates = nextOccurrences(rule, [], 3, localDate(2026, 7, 10));
    expect(dates.map(localDateString)).toEqual(['2026-08-05', '2026-09-05', '2026-10-05']);
  });

  it('pula ocorrências futuras já materializadas manualmente', () => {
    const rule = recurringFixture();
    const materialized: Transaction = {
      recurringId: 'rule-1',
      date: localDate(2026, 8, 5),
    } as Transaction;
    const dates = nextOccurrences(rule, [materialized], 2, localDate(2026, 7, 10));
    expect(dates.map(localDateString)).toEqual(['2026-09-05', '2026-10-05']);
  });

  it('para no endDate, devolvendo menos que `count` se a regra terminar antes', () => {
    const rule = recurringFixture({ endDate: localDate(2026, 9, 5) });
    const dates = nextOccurrences(rule, [], 5, localDate(2026, 7, 10));
    expect(dates.map(localDateString)).toEqual(['2026-08-05', '2026-09-05']);
  });

  it('parte de nextDate, não recalcula ocorrências de meses já resolvidos por vínculo', () => {
    const rule = recurringFixture({
      startDate: localDate(2026, 1, 5),
      nextDate: localDate(2026, 8, 5),
    });
    const dates = nextOccurrences(rule, [], 2, localDate(2026, 7, 10));
    expect(dates.map(localDateString)).toEqual(['2026-08-05', '2026-09-05']);
  });
});
