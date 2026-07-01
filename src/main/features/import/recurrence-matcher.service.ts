import { nextOccurrenceOnOrAfter } from '@shared/recurrence';
import type { TransactionType } from '@shared/enums';
import type { ImportMatch, Recurring, TransactionTemplate } from '@shared/types';
import { and, eq, gte, lte } from 'drizzle-orm';
import { getDb, schema } from '../../database/database.module';
import { Service } from '../../core/service.decorator';
import { similarityText } from './normalize';

/** Linha candidata (já com conta resolvida) para casar com recorrências. */
export interface MatchCandidate {
  readonly accountId: string;
  readonly date: Date;
  readonly description: string;
  readonly type: TransactionType;
}

const DAY_MS = 86_400_000;
/** Janela de tolerância (em dias) entre a ocorrência prevista e a linha real. */
const DATE_WINDOW_DAYS = 6;
/** Similaridade mínima de descrição para considerar um casamento. */
const MIN_SIMILARITY = 0.6;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * Casa linhas importadas com recorrências já existentes do usuário: mesma conta
 * e tipo, descrição similar (`fastest-levenshtein`) e uma ocorrência prevista
 * dentro da janela de datas. Quando a ocorrência já foi materializada, devolve
 * o id da linha para o commit reconciliar (update in-place) em vez de duplicar.
 */
@Service('recurrence-matcher')
export class RecurrenceMatcherService {
  match(
    userId: string,
    candidate: MatchCandidate,
    rules: readonly Recurring[],
  ): ImportMatch | undefined {
    let best: { rule: Recurring; occurrence: Date; score: number } | undefined;

    for (const rule of rules) {
      const template = rule.template as TransactionTemplate;
      if (template.type !== candidate.type) continue;
      if (template.accountId !== candidate.accountId) continue;

      const occurrence = this.nearestOccurrence(rule, candidate.date);
      if (!occurrence) continue;

      const score = Math.max(
        similarityText(candidate.description, rule.name),
        similarityText(candidate.description, template.description),
      );
      if (score < MIN_SIMILARITY) continue;
      if (!best || score > best.score) best = { rule, occurrence, score };
    }

    if (!best) return undefined;
    return {
      recurringId: best.rule.id,
      recurringName: best.rule.name,
      occurrenceDate: best.occurrence,
      materializedTransactionId: this.findMaterialized(userId, best.rule.id, best.occurrence),
    };
  }

  /** Ocorrência da regra mais próxima da data alvo, dentro da janela. */
  private nearestOccurrence(rule: Recurring, target: Date): Date | undefined {
    const occurrence = nextOccurrenceOnOrAfter(
      {
        startDate: rule.startDate,
        endDate: rule.endDate ?? null,
        nextDate: null,
        pattern: rule.recurringPattern,
      },
      addDays(target, -DATE_WINDOW_DAYS),
    );
    if (!occurrence) return undefined;
    const deltaDays = Math.abs(occurrence.getTime() - target.getTime()) / DAY_MS;
    return deltaDays <= DATE_WINDOW_DAYS ? occurrence : undefined;
  }

  /** Id da transação já materializada pela regra dentro da janela, se houver. */
  private findMaterialized(
    userId: string,
    recurringId: string,
    occurrence: Date,
  ): string | undefined {
    const db = getDb();
    const row = db
      .select({ id: schema.transactions.id })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, userId),
          eq(schema.transactions.recurringId, recurringId),
          gte(schema.transactions.date, addDays(occurrence, -DATE_WINDOW_DAYS)),
          lte(schema.transactions.date, addDays(occurrence, DATE_WINDOW_DAYS)),
        ),
      )
      .get();
    return row?.id;
  }
}
