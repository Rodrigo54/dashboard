import type { TransactionType } from '@shared/enums';
import { nextOccurrence, sameCalendarDay } from '@shared/recurrence';
import type { Recurring, Transaction, TransactionTemplate } from '@shared/types';
import type { LedgerRow } from './ledger-row';

/** Trava contra avanço degenerado ao alcançar meses muito distantes. */
const MAX_STEPS = 2000;

export interface ForecastFilter {
  readonly year: number;
  /** Mês 1-12. */
  readonly month: number;
  readonly accountId?: string;
  readonly type?: TransactionType;
}

/** A lista de recorrências desta tela é sempre de transação (controller filtra). */
function templateOf(rule: Recurring): TransactionTemplate {
  return rule.template as TransactionTemplate;
}

/** Ocorrências da regra que caem dentro do mês exibido, respeitando o término. */
function occurrencesInMonth(rule: Recurring, start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  let cursor = new Date(rule.startDate);
  let steps = 0;

  while (cursor < start && steps < MAX_STEPS) {
    cursor = nextOccurrence(cursor, rule.recurringPattern);
    steps += 1;
  }

  while (cursor <= end && steps < MAX_STEPS) {
    if (rule.endDate && cursor > rule.endDate) break;
    dates.push(new Date(cursor));
    cursor = nextOccurrence(cursor, rule.recurringPattern);
    steps += 1;
  }

  return dates;
}

function toForecastRow(rule: Recurring, date: Date): LedgerRow {
  const template = templateOf(rule);
  return {
    kind: 'forecast',
    key: `f:${rule.id}:${date.getTime()}`,
    date,
    description: rule.name,
    accountId: template.accountId,
    type: template.type,
    category: template.category,
    amount: template.amount,
    recurring: true,
    rule,
    ruleStatus: rule.status === 'paused' ? 'paused' : 'active',
  };
}

/**
 * Linhas de previsão para o mês exibido: cada ocorrência das regras
 * ativas/pausadas que ainda não virou transação. Aplica os mesmos filtros de
 * conta/tipo da listagem e pula as ocorrências já materializadas.
 */
export function forecastRows(
  rules: readonly Recurring[],
  transactions: readonly Transaction[],
  filter: ForecastFilter,
): LedgerRow[] {
  const start = new Date(filter.year, filter.month - 1, 1);
  const end = new Date(filter.year, filter.month, 0, 23, 59, 59, 999);
  const rows: LedgerRow[] = [];

  for (const rule of rules) {
    if (rule.status === 'completed') continue;

    const template = templateOf(rule);
    if (filter.accountId && template.accountId !== filter.accountId) continue;
    if (filter.type && template.type !== filter.type) continue;

    for (const date of occurrencesInMonth(rule, start, end)) {
      const materialized = transactions.some(
        (t) => t.recurringId === rule.id && sameCalendarDay(new Date(t.date), date),
      );
      if (!materialized) rows.push(toForecastRow(rule, date));
    }
  }

  return rows;
}

/**
 * Próximas `count` ocorrências previstas da regra a partir de `from` (hoje,
 * por padrão), pulando as já materializadas — usada pela transactions-view
 * para mostrar o que vem a seguir, independente de mês. Mesmo motor de
 * `forecastRows` (`nextOccurrence`), só que com corte por contagem em vez de
 * limite de calendário.
 */
export function nextOccurrences(
  rule: Recurring,
  transactions: readonly Transaction[],
  count: number,
  from: Date = new Date(),
): Date[] {
  const dates: Date[] = [];
  let cursor = new Date(rule.startDate);
  let steps = 0;

  while (cursor < from && steps < MAX_STEPS) {
    cursor = nextOccurrence(cursor, rule.recurringPattern);
    steps += 1;
  }

  while (dates.length < count && steps < MAX_STEPS) {
    if (rule.endDate && cursor > rule.endDate) break;
    const materialized = transactions.some(
      (t) => t.recurringId === rule.id && sameCalendarDay(new Date(t.date), cursor),
    );
    if (!materialized) dates.push(new Date(cursor));
    cursor = nextOccurrence(cursor, rule.recurringPattern);
    steps += 1;
  }

  return dates;
}
