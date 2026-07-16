import { describe, expect, it } from 'vitest';
import type { RecurringPattern, TransactionTemplate } from '@shared/types';
import type { schema } from '../../database/database.module';
import { bestSameAccountRule, type AutoLinkCandidateLine } from './recurrence-auto-link.utils';

const monthlyPattern: RecurringPattern = {
  frequency: 'monthly',
  interval: 1,
  dayOfMonth: 6,
  businessDaysOnly: false,
  timezone: 'America/Sao_Paulo',
};

function rule(overrides: Partial<schema.Recurring> = {}): schema.Recurring {
  const template: TransactionTemplate = {
    accountId: 'acc-itau',
    type: 'expense',
    category: 'food',
    amount: '100.00',
    description: 'PAGTO SALARIO',
  };
  return {
    id: 'rule-1',
    userId: 'user-1',
    type: 'transaction',
    name: 'Salário',
    description: null,
    template,
    recurringPattern: monthlyPattern,
    startDate: new Date(2026, 0, 6),
    endDate: null,
    nextDate: new Date(2026, 6, 6),
    status: 'active',
    source: 'manual',
    autoMaterialize: true,
    executionCount: 0,
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    ...overrides,
  } as schema.Recurring;
}

function line(overrides: Partial<AutoLinkCandidateLine> = {}): AutoLinkCandidateLine {
  return {
    accountId: 'acc-itau',
    type: 'expense',
    description: 'PAGTO SALARIO',
    amount: '100.00',
    date: new Date(2026, 6, 6),
    ...overrides,
  };
}

describe('bestSameAccountRule', () => {
  it('retorna a regra quando bate o threshold de auto-link', () => {
    const ruleId = rule();
    expect(bestSameAccountRule(line(), [ruleId])).toBe(ruleId);
  });

  it('ignora regras de conta diferente, mesmo com score alto', () => {
    const other = rule({
      id: 'rule-2',
      template: { ...rule().template, accountId: 'acc-bb' } as TransactionTemplate,
    });
    expect(bestSameAccountRule(line({ accountId: 'acc-itau' }), [other])).toBeUndefined();
  });

  it('retorna undefined quando duas regras da mesma conta empatam (margem)', () => {
    const ruleA = rule({ id: 'rule-a' });
    const ruleB = rule({ id: 'rule-b' });
    expect(bestSameAccountRule(line(), [ruleA, ruleB])).toBeUndefined();
  });

  it('retorna undefined quando nenhuma regra bate o threshold', () => {
    // Ocorrência mensal no dia 20: 14 dias de distância do dia 6 (fora da
    // janela de decaimento de data) — só texto+valor não alcançam 0.85.
    const distant = rule({
      startDate: new Date(2026, 0, 20),
      nextDate: new Date(2026, 6, 20),
      recurringPattern: { ...monthlyPattern, dayOfMonth: 20 },
    });
    expect(bestSameAccountRule(line(), [distant])).toBeUndefined();
  });
});
