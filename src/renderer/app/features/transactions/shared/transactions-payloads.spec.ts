import { describe, expect, it } from 'vitest';
import type { RecurringFormModel } from '@/features/recurring/pages/recurring-form/recurring-form';
import { buildCreateRecurringFromRule } from './transactions-payloads';

function modelFixture(overrides: Partial<RecurringFormModel> = {}): RecurringFormModel {
  return {
    name: 'Salário',
    accountId: 'acc-1',
    type: 'income',
    category: 'salary',
    amount: '3000.00',
    description: 'Pagto salário',
    frequency: 'monthly',
    startDate: '2026-07-06',
    endDate: '',
    ...overrides,
  };
}

describe('buildCreateRecurringFromRule', () => {
  it('converte o modelo do form em CreateRecurring, ancorando o dia do mês no startDate', () => {
    const payload = buildCreateRecurringFromRule(modelFixture());

    expect(payload).toMatchObject({
      type: 'transaction',
      name: 'Salário',
      template: {
        accountId: 'acc-1',
        type: 'income',
        category: 'salary',
        amount: '3000.00',
        description: 'Pagto salário',
      },
      recurringPattern: { frequency: 'monthly', interval: 1, dayOfMonth: 6 },
    });
    expect(payload.startDate).toEqual(new Date(2026, 6, 6));
    expect(payload.endDate).toBeUndefined();
  });

  it('inclui endDate só quando informado', () => {
    const payload = buildCreateRecurringFromRule(modelFixture({ endDate: '2026-12-31' }));
    expect(payload.endDate).toEqual(new Date(2026, 11, 31));
  });

  it('ancora o dia da semana para frequência semanal', () => {
    const payload = buildCreateRecurringFromRule(
      modelFixture({ frequency: 'weekly', startDate: '2026-07-06' }), // segunda-feira
    );
    expect(payload.recurringPattern).toMatchObject({ frequency: 'weekly', dayOfWeek: 1 });
  });
});
