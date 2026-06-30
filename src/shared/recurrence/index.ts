import type { RecurringPattern } from '../types';

/**
 * Motor de datas das recorrências: funções puras que calculam ocorrências a
 * partir do `RecurringPattern`. Trabalha em horário local (app desktop);
 * `businessDaysOnly`/`timezone` ainda não são interpretados — ficam nos
 * defaults do schema até a entrega que os expuser no form.
 */

/** Janela da regra usada pelos cálculos (subconjunto da linha de `recurring`). */
export interface RecurrenceWindow {
  startDate: Date;
  endDate: Date | null;
  nextDate: Date | null;
  pattern: RecurringPattern;
}

export interface PendingOccurrences {
  /** Ocorrências vencidas (<= now) a materializar, em ordem cronológica. */
  occurrences: Date[];
  /** Próxima ocorrência futura, ou null quando a regra passou do endDate. */
  nextDate: Date | null;
}

/** Trava de segurança contra catch-up degenerado (ex.: anos de atraso em daily). */
const MAX_OCCURRENCES_PER_CATCH_UP = 1000;

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Avança meses clampando o dia à âncora (31 -> 28/fev -> 31/mar). */
function addMonthsClamped(date: Date, months: number, anchorDay: number): Date {
  const total = date.getMonth() + months;
  const year = date.getFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const day = Math.min(anchorDay, daysInMonth(year, month));
  const next = new Date(date);
  next.setFullYear(year, month, day);
  return next;
}

/** Calcula a ocorrência seguinte a `date`, preservando o horário do cursor. */
export function nextOccurrence(date: Date, pattern: RecurringPattern): Date {
  const interval = pattern.interval;
  switch (pattern.frequency) {
    case 'daily':
      return addDays(date, interval);
    case 'weekly':
      return addDays(date, interval * 7);
    case 'monthly':
      return addMonthsClamped(date, interval, pattern.dayOfMonth ?? date.getDate());
    case 'yearly':
      return addMonthsClamped(date, interval * 12, pattern.dayOfMonth ?? date.getDate());
  }
}

/**
 * Catch-up: todas as ocorrências vencidas até `now` (respeitando o endDate)
 * e o novo `nextDate` — `null` indica que a regra se completou.
 */
export function pendingOccurrences(rule: RecurrenceWindow, now: Date): PendingOccurrences {
  const occurrences: Date[] = [];
  let cursor = rule.nextDate ?? rule.startDate;

  while (cursor <= now && occurrences.length < MAX_OCCURRENCES_PER_CATCH_UP) {
    if (rule.endDate && cursor > rule.endDate) break;
    occurrences.push(cursor);
    cursor = nextOccurrence(cursor, rule.pattern);
  }

  const completed = rule.endDate !== null && cursor > rule.endDate;
  return { occurrences, nextDate: completed ? null : cursor };
}

/**
 * Primeira ocorrência >= `now`, pulando as vencidas sem materializá-las —
 * semântica da retomada de uma regra pausada. `null` quando a regra já
 * passou do endDate.
 */
export function nextOccurrenceOnOrAfter(rule: RecurrenceWindow, now: Date): Date | null {
  let cursor = rule.nextDate ?? rule.startDate;
  let steps = 0;

  while (cursor < now && steps < MAX_OCCURRENCES_PER_CATCH_UP) {
    cursor = nextOccurrence(cursor, rule.pattern);
    steps += 1;
  }

  return rule.endDate && cursor > rule.endDate ? null : cursor;
}
