import { describe, expect, it } from 'vitest';

import type { RecurringPattern } from '../types';
import { nextOccurrence, nextOccurrenceOnOrAfter, pendingOccurrences } from './index';

function pattern(overrides: Partial<RecurringPattern> = {}): RecurringPattern {
  return {
    frequency: 'monthly',
    interval: 1,
    businessDaysOnly: false,
    timezone: 'America/Sao_Paulo',
    ...overrides,
  };
}

describe('nextOccurrence', () => {
  it('avança um dia no frequency daily', () => {
    expect(nextOccurrence(new Date(2026, 5, 12), pattern({ frequency: 'daily' }))).toEqual(
      new Date(2026, 5, 13),
    );
  });

  it('avança sete dias no frequency weekly preservando o dia da semana', () => {
    const next = nextOccurrence(new Date(2026, 5, 12), pattern({ frequency: 'weekly' }));
    expect(next).toEqual(new Date(2026, 5, 19));
    expect(next.getDay()).toBe(new Date(2026, 5, 12).getDay());
  });

  it('avança um mês no frequency monthly', () => {
    expect(
      nextOccurrence(new Date(2026, 0, 15), pattern({ frequency: 'monthly', dayOfMonth: 15 })),
    ).toEqual(new Date(2026, 1, 15));
  });

  it('clampa o fim do mês (31/jan -> 28/fev) sem degradar a âncora', () => {
    const p = pattern({ frequency: 'monthly', dayOfMonth: 31 });
    const feb = nextOccurrence(new Date(2026, 0, 31), p);
    expect(feb).toEqual(new Date(2026, 1, 28));
    // A âncora (dayOfMonth: 31) é retomada nos meses que a comportam.
    expect(nextOccurrence(feb, p)).toEqual(new Date(2026, 2, 31));
  });

  it('usa o dia do cursor quando dayOfMonth não foi definido', () => {
    expect(nextOccurrence(new Date(2026, 0, 31), pattern({ frequency: 'monthly' }))).toEqual(
      new Date(2026, 1, 28),
    );
  });

  it('avança um ano no frequency yearly, clampando 29/fev', () => {
    expect(nextOccurrence(new Date(2024, 1, 29), pattern({ frequency: 'yearly' }))).toEqual(
      new Date(2025, 1, 28),
    );
  });

  it('preserva o horário do cursor', () => {
    const next = nextOccurrence(new Date(2026, 5, 12, 9, 30), pattern({ frequency: 'daily' }));
    expect(next.getHours()).toBe(9);
    expect(next.getMinutes()).toBe(30);
  });
});

describe('pendingOccurrences', () => {
  const now = new Date(2026, 5, 12); // 12/jun/2026

  it('materializa todas as ocorrências vencidas desde o startDate (catch-up)', () => {
    const result = pendingOccurrences(
      {
        startDate: new Date(2026, 2, 5),
        endDate: null,
        nextDate: null,
        pattern: pattern({ frequency: 'monthly', dayOfMonth: 5 }),
      },
      now,
    );
    expect(result.occurrences).toEqual([
      new Date(2026, 2, 5),
      new Date(2026, 3, 5),
      new Date(2026, 4, 5),
      new Date(2026, 5, 5),
    ]);
    expect(result.nextDate).toEqual(new Date(2026, 6, 5));
  });

  it('continua do nextDate quando presente', () => {
    const result = pendingOccurrences(
      {
        startDate: new Date(2026, 0, 5),
        endDate: null,
        nextDate: new Date(2026, 4, 5),
        pattern: pattern({ frequency: 'monthly', dayOfMonth: 5 }),
      },
      now,
    );
    expect(result.occurrences).toEqual([new Date(2026, 4, 5), new Date(2026, 5, 5)]);
  });

  it('não gera nada quando a primeira ocorrência é futura', () => {
    const result = pendingOccurrences(
      {
        startDate: new Date(2026, 6, 1),
        endDate: null,
        nextDate: null,
        pattern: pattern({ frequency: 'monthly', dayOfMonth: 1 }),
      },
      now,
    );
    expect(result.occurrences).toEqual([]);
    expect(result.nextDate).toEqual(new Date(2026, 6, 1));
  });

  it('encerra no endDate: nextDate vira null (regra concluída)', () => {
    const result = pendingOccurrences(
      {
        startDate: new Date(2026, 3, 10),
        endDate: new Date(2026, 4, 31),
        nextDate: null,
        pattern: pattern({ frequency: 'monthly', dayOfMonth: 10 }),
      },
      now,
    );
    expect(result.occurrences).toEqual([new Date(2026, 3, 10), new Date(2026, 4, 10)]);
    expect(result.nextDate).toBeNull();
  });

  it('catch-up diário longo não trava nem duplica', () => {
    const result = pendingOccurrences(
      {
        startDate: new Date(2026, 5, 1),
        endDate: null,
        nextDate: null,
        pattern: pattern({ frequency: 'daily' }),
      },
      now,
    );
    expect(result.occurrences).toHaveLength(12);
    expect(result.nextDate).toEqual(new Date(2026, 5, 13));
  });
});

describe('nextOccurrenceOnOrAfter', () => {
  const now = new Date(2026, 5, 12);

  it('pula ocorrências vencidas sem materializá-las (retomada de pausa)', () => {
    const next = nextOccurrenceOnOrAfter(
      {
        startDate: new Date(2026, 0, 20),
        endDate: null,
        nextDate: new Date(2026, 2, 20),
        pattern: pattern({ frequency: 'monthly', dayOfMonth: 20 }),
      },
      now,
    );
    expect(next).toEqual(new Date(2026, 5, 20));
  });

  it('retorna null quando todas as ocorrências restantes passam do endDate', () => {
    const next = nextOccurrenceOnOrAfter(
      {
        startDate: new Date(2026, 0, 20),
        endDate: new Date(2026, 3, 30),
        nextDate: new Date(2026, 2, 20),
        pattern: pattern({ frequency: 'monthly', dayOfMonth: 20 }),
      },
      now,
    );
    expect(next).toBeNull();
  });
});
