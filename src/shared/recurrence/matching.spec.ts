import { describe, expect, it } from 'vitest';
import type { RecurringPattern } from '../types';
import {
  AUTO_LINK_MARGIN,
  AUTO_LINK_THRESHOLD,
  bestAutoLinkCandidate,
  CANDIDATE_MIN_THRESHOLD,
  computeRecurrenceProbability,
  isAutoLinkCandidate,
  nearestRuleOccurrence,
  type RecurrenceMatchInput,
} from './matching';

function pattern(overrides: Partial<RecurringPattern> = {}): RecurringPattern {
  return {
    frequency: 'monthly',
    interval: 1,
    dayOfMonth: 6,
    businessDaysOnly: false,
    timezone: 'America/Sao_Paulo',
    ...overrides,
  };
}

function input(overrides: Partial<RecurrenceMatchInput> = {}): RecurrenceMatchInput {
  return {
    transactionDescription: 'PAGTO SALARIO',
    transactionAmount: '3000.00',
    transactionDate: new Date(2026, 6, 6), // 06/jul/2026
    transactionType: 'income',
    transactionAccountId: 'acc-itau',
    recurring: {
      name: 'Salário 1ª parcela',
      templateDescription: 'PAGTO SALARIO',
      templateAmount: '3000.00',
      templateType: 'income',
      templateAccountId: 'acc-itau',
      startDate: new Date(2026, 0, 6),
      endDate: null,
      nextDate: new Date(2026, 6, 6),
      recurringPattern: pattern({ dayOfMonth: 6 }),
    },
    ...overrides,
  };
}

describe('computeRecurrenceProbability', () => {
  it('retorna próximo de 1 quando texto, data e valor batem exatamente', () => {
    expect(computeRecurrenceProbability(input())).toBeCloseTo(1, 5);
  });

  it('retorna 0 quando o tipo diverge (filtro duro)', () => {
    const score = computeRecurrenceProbability(input({ transactionType: 'expense' }));
    expect(score).toBe(0);
  });

  it('aplica penalidade multiplicativa quando a conta diverge', () => {
    const same = computeRecurrenceProbability(input());
    const diffAccount = computeRecurrenceProbability(input({ transactionAccountId: 'acc-bb' }));
    expect(diffAccount).toBeCloseTo(same * 0.8, 5);
  });

  it('descrições distintas reduzem a pontuação de texto', () => {
    const exact = computeRecurrenceProbability(input());
    const different = computeRecurrenceProbability(
      input({ transactionDescription: 'NETFLIX ASSINATURA' }),
    );
    expect(different).toBeLessThan(exact);
  });

  it('decai suavemente conforme a distância da data prevista aumenta', () => {
    const onTime = computeRecurrenceProbability(input());
    const near = computeRecurrenceProbability(
      input({ transactionDate: new Date(2026, 6, 9) }), // 3 dias depois
    );
    const far = computeRecurrenceProbability(
      input({ transactionDate: new Date(2026, 6, 15) }), // 9 dias depois
    );
    expect(onTime).toBeGreaterThan(near);
    expect(near).toBeGreaterThan(far);
  });

  it('zera a contribuição de data quando passa dos ~10 dias de janela', () => {
    const withinWindow = computeRecurrenceProbability(
      input({ transactionDate: new Date(2026, 6, 15) }), // 9 dias
    );
    const outsideWindow = computeRecurrenceProbability(
      input({ transactionDate: new Date(2026, 6, 20) }), // 14 dias
    );
    expect(outsideWindow).toBeLessThan(withinWindow);
    // Fora da janela, só sobra texto (0.5) e valor (0.2): teto de 0.7.
    expect(outsideWindow).toBeLessThanOrEqual(0.7 + 1e-9);
  });

  it('reduz a pontuação de valor proporcionalmente à diferença percentual', () => {
    const exact = computeRecurrenceProbability(input());
    const slightlyOff = computeRecurrenceProbability(input({ transactionAmount: '3050.00' }));
    const veryOff = computeRecurrenceProbability(input({ transactionAmount: '5000.00' }));
    expect(exact).toBeGreaterThan(slightlyOff);
    expect(slightlyOff).toBeGreaterThan(veryOff);
  });

  it('caso real: salário mensal (dia 6) não se confunde com 13º (dia 30/jun) quando a data bate exata em cada um', () => {
    const salaryRule = input().recurring;
    const thirteenthRule = {
      ...salaryRule,
      name: '13º salário 1ª parcela',
      startDate: new Date(2025, 5, 30),
      nextDate: new Date(2026, 5, 30),
      recurringPattern: pattern({ frequency: 'yearly', dayOfMonth: 30 }),
    };

    // Parcela do 13º cai em 30/jun — mesma descrição "PAGTO SALARIO" nos dois casos.
    const thirteenthPayment: RecurrenceMatchInput = {
      transactionDescription: 'PAGTO SALARIO',
      transactionAmount: '3000.00',
      transactionDate: new Date(2026, 5, 30),
      transactionType: 'income',
      transactionAccountId: 'acc-itau',
      recurring: thirteenthRule,
    };
    const scoreAgainstThirteenth = computeRecurrenceProbability(thirteenthPayment);
    const scoreAgainstSalary = computeRecurrenceProbability({
      ...thirteenthPayment,
      recurring: salaryRule,
    });

    expect(scoreAgainstThirteenth).toBeGreaterThan(scoreAgainstSalary);
    expect(scoreAgainstThirteenth).toBeGreaterThanOrEqual(AUTO_LINK_THRESHOLD);
  });
});

describe('isAutoLinkCandidate', () => {
  it('permite auto-link quando o melhor score passa o threshold e não há disputa', () => {
    expect(isAutoLinkCandidate(0.9, undefined)).toBe(true);
    expect(isAutoLinkCandidate(AUTO_LINK_THRESHOLD, undefined)).toBe(true);
  });

  it('bloqueia auto-link quando o melhor score não atinge o threshold', () => {
    expect(isAutoLinkCandidate(0.84, undefined)).toBe(false);
    expect(isAutoLinkCandidate(0.5, 0.3)).toBe(false);
  });

  it('bloqueia auto-link quando a vantagem sobre o 2º candidato é menor que a margem', () => {
    expect(isAutoLinkCandidate(0.91, 0.9)).toBe(false);
    expect(isAutoLinkCandidate(0.91, 0.91 - AUTO_LINK_MARGIN + 0.001)).toBe(false);
  });

  it('permite auto-link quando a vantagem sobre o 2º candidato atinge a margem', () => {
    expect(isAutoLinkCandidate(0.95, 0.85)).toBe(true);
    expect(isAutoLinkCandidate(0.91, 0.91 - AUTO_LINK_MARGIN)).toBe(true);
  });

  it('caso real: salário atrasado empata entre duas regras irmãs — trava o auto-link', () => {
    // Ambas marcam ~0.91 (mesma descrição, valor igual, 3 dias de distância cada).
    expect(isAutoLinkCandidate(0.91, 0.91)).toBe(false);
  });
});

describe('CANDIDATE_MIN_THRESHOLD', () => {
  it('é 0.4', () => {
    expect(CANDIDATE_MIN_THRESHOLD).toBe(0.4);
  });
});

describe('AUTO_LINK_THRESHOLD', () => {
  it('é 0.85', () => {
    expect(AUTO_LINK_THRESHOLD).toBe(0.85);
  });
});

describe('AUTO_LINK_MARGIN', () => {
  it('é 0.10', () => {
    expect(AUTO_LINK_MARGIN).toBe(0.1);
  });
});

describe('nearestRuleOccurrence', () => {
  const startDate = new Date(2026, 0, 6); // 06/jan/2026
  const monthly6 = pattern({ frequency: 'monthly', dayOfMonth: 6 });

  it('retorna a própria data quando ela coincide com uma ocorrência', () => {
    const target = new Date(2026, 6, 6); // 06/jul/2026
    expect(nearestRuleOccurrence(monthly6, startDate, null, target)).toEqual(target);
  });

  it('retorna a ocorrência mais próxima quando a data cai fora, mas dentro da janela', () => {
    const target = new Date(2026, 6, 9); // 09/jul/2026 — 3 dias após a ocorrência
    expect(nearestRuleOccurrence(monthly6, startDate, null, target)).toEqual(new Date(2026, 6, 6));
  });

  it('retorna undefined quando não há ocorrência dentro de ~10 dias', () => {
    const target = new Date(2026, 6, 20); // 14 dias da ocorrência de julho
    expect(nearestRuleOccurrence(monthly6, startDate, null, target)).toBeUndefined();
  });

  it('respeita o endDate: nenhuma ocorrência além dele', () => {
    const target = new Date(2026, 6, 6);
    const endDate = new Date(2026, 5, 30); // termina antes de julho
    expect(nearestRuleOccurrence(monthly6, startDate, endDate, target)).toBeUndefined();
  });
});

describe('bestAutoLinkCandidate', () => {
  it('retorna undefined para lista vazia', () => {
    expect(bestAutoLinkCandidate([])).toBeUndefined();
  });

  it('retorna o valor do único candidato quando ele bate o threshold', () => {
    expect(bestAutoLinkCandidate([{ value: 'a', score: 0.9 }])).toBe('a');
  });

  it('retorna undefined quando o melhor não bate o threshold', () => {
    expect(bestAutoLinkCandidate([{ value: 'a', score: 0.5 }])).toBeUndefined();
  });

  it('retorna o melhor quando ele abre vantagem suficiente sobre o segundo', () => {
    const result = bestAutoLinkCandidate([
      { value: 'b', score: 0.7 },
      { value: 'a', score: 0.95 },
    ]);
    expect(result).toBe('a');
  });

  it('retorna undefined quando o melhor e o segundo empatam (regras irmãs)', () => {
    const result = bestAutoLinkCandidate([
      { value: 'a', score: 0.91 },
      { value: 'b', score: 0.91 },
    ]);
    expect(result).toBeUndefined();
  });
});
