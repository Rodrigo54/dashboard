import { negateDecimal } from '@shared/decimal';
import { nextOccurrence } from '@shared/recurrence';
import {
  CANDIDATE_MIN_THRESHOLD,
  computeRecurrenceProbability,
  nearestRuleOccurrence,
} from '@shared/recurrence/matching';
import type { RecurrenceMatchCandidate, TransactionTemplate } from '@shared/types';
import { and, eq, gte, inArray, isNull, lt, ne } from 'drizzle-orm';
import { getDb, schema } from '../../database/database.module';
import { Service } from '../../core/service.decorator';
import { inject } from '../../core/services.providers';
import { AccountBalanceService } from '../accounts/account-balance.service';

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Matching de recorrências contra o histórico de transações: sugere
 * candidatos por probabilidade (`shared/recurrence/matching.ts`) para a tela
 * geral de detecção e para a `transactions-view`, e executa o vínculo (merge
 * completo) ou desvínculo.
 *
 * "Merge completo" no `linkTransaction`: se a ocorrência casada já foi
 * materializada pelo `RecurringMaterializerService`, a linha materializada é
 * removida (revertendo seu saldo) em favor da transação real sendo vinculada
 * — nunca sobra duplicata. Se a ocorrência é a próxima pendente da regra
 * (`nextDate`), o `nextDate` avança, como se ela tivesse sido materializada
 * normalmente.
 */
@Service('recurrence-matching')
export class RecurrenceMatchingService {
  private readonly balance = inject(AccountBalanceService);

  /** Melhor candidato por transação sem vínculo no mês informado, ordenado desc. */
  findMatchCandidates(userId: string, year: number, month: number): RecurrenceMatchCandidate[] {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);
    const db = getDb();
    const transactions = db
      .select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, userId),
          isNull(schema.transactions.recurringId),
          ne(schema.transactions.type, 'transfer'),
          gte(schema.transactions.date, monthStart),
          lt(schema.transactions.date, monthEnd),
        ),
      )
      .all();
    if (transactions.length === 0) return [];

    const rules = this.activeRules(userId);
    return transactions
      .map((transaction) => this.bestCandidate(transaction, rules))
      .filter((candidate): candidate is RecurrenceMatchCandidate => candidate !== undefined)
      .sort((a, b) => b.score - a.score);
  }

  /** Todos os candidatos (≥ threshold) de uma transação específica, ordenado desc. */
  findCandidatesForTransaction(userId: string, transactionId: string): RecurrenceMatchCandidate[] {
    const transaction = this.getUnlinkedTransaction(userId, transactionId);
    const rules = this.activeRules(userId);
    return rules
      .map((rule) => this.scoreCandidate(transaction, rule))
      .filter((candidate): candidate is RecurrenceMatchCandidate => candidate !== undefined)
      .sort((a, b) => b.score - a.score);
  }

  /** Vincula a transação à regra (merge completo — ver docstring da classe). */
  linkTransaction(userId: string, transactionId: string, recurringId: string): void {
    const db = getDb();
    const transaction = this.getUnlinkedTransaction(userId, transactionId);
    const rule = db
      .select()
      .from(schema.recurring)
      .where(
        and(
          eq(schema.recurring.id, recurringId),
          eq(schema.recurring.userId, userId),
          eq(schema.recurring.type, 'transaction'),
        ),
      )
      .get();
    if (!rule) throw new Error('Recorrência não encontrada');

    const occurrence = nearestRuleOccurrence(
      rule.recurringPattern,
      rule.startDate,
      rule.endDate,
      transaction.date,
    );

    db.transaction((tx) => {
      if (occurrence) {
        const materialized = tx
          .select()
          .from(schema.transactions)
          .where(
            and(
              eq(schema.transactions.userId, userId),
              eq(schema.transactions.recurringId, recurringId),
            ),
          )
          .all()
          .find((t) => sameCalendarDay(t.date, occurrence));

        if (materialized) {
          this.balance.applyBalanceDelta(
            tx,
            userId,
            materialized.accountId,
            negateDecimal(this.balance.signedAmount(materialized.type, materialized.amount)),
          );
          tx.delete(schema.transactions).where(eq(schema.transactions.id, materialized.id)).run();
        } else if (rule.nextDate && sameCalendarDay(rule.nextDate, occurrence)) {
          const advanced = nextOccurrence(occurrence, rule.recurringPattern);
          const completed = rule.endDate !== null && advanced > rule.endDate;
          tx.update(schema.recurring)
            .set({
              nextDate: completed ? null : advanced,
              executionCount: rule.executionCount + 1,
              ...(completed ? { status: 'completed' as const } : {}),
            })
            .where(eq(schema.recurring.id, rule.id))
            .run();
        }
      }

      tx.update(schema.transactions)
        .set({ recurringId })
        .where(eq(schema.transactions.id, transactionId))
        .run();
    });
  }

  /** Desvincula a transação da recorrência (não recria materializada nem retrocede `nextDate`). */
  unlinkTransaction(userId: string, transactionId: string): void {
    const db = getDb();
    const transaction = db
      .select()
      .from(schema.transactions)
      .where(and(eq(schema.transactions.id, transactionId), eq(schema.transactions.userId, userId)))
      .get();
    if (!transaction) throw new Error('Transação não encontrada');
    if (transaction.recurringId === null) {
      throw new Error('Transação não está vinculada a uma recorrência');
    }
    db.update(schema.transactions)
      .set({ recurringId: null })
      .where(eq(schema.transactions.id, transactionId))
      .run();
  }

  private getUnlinkedTransaction(userId: string, transactionId: string): schema.Transaction {
    const db = getDb();
    const transaction = db
      .select()
      .from(schema.transactions)
      .where(and(eq(schema.transactions.id, transactionId), eq(schema.transactions.userId, userId)))
      .get();
    if (!transaction) throw new Error('Transação não encontrada');
    if (transaction.recurringId !== null) {
      throw new Error('Transação já está vinculada a uma recorrência');
    }
    return transaction;
  }

  /** Regras de transação ativas/pausadas do usuário — mesmo escopo do preview de import. */
  private activeRules(userId: string): schema.Recurring[] {
    const db = getDb();
    return db
      .select()
      .from(schema.recurring)
      .where(
        and(
          eq(schema.recurring.userId, userId),
          eq(schema.recurring.type, 'transaction'),
          inArray(schema.recurring.status, ['active', 'paused']),
        ),
      )
      .all();
  }

  private bestCandidate(
    transaction: schema.Transaction,
    rules: readonly schema.Recurring[],
  ): RecurrenceMatchCandidate | undefined {
    let best: RecurrenceMatchCandidate | undefined;
    for (const rule of rules) {
      const candidate = this.scoreCandidate(transaction, rule);
      if (candidate && (!best || candidate.score > best.score)) best = candidate;
    }
    return best;
  }

  private scoreCandidate(
    transaction: schema.Transaction,
    rule: schema.Recurring,
  ): RecurrenceMatchCandidate | undefined {
    const template = rule.template as TransactionTemplate;
    const score = computeRecurrenceProbability({
      transactionDescription: transaction.description,
      transactionAmount: transaction.amount,
      transactionDate: transaction.date,
      transactionType: transaction.type,
      transactionAccountId: transaction.accountId,
      recurring: {
        name: rule.name,
        templateDescription: template.description,
        templateAmount: template.amount,
        templateType: template.type,
        templateAccountId: template.accountId,
        startDate: rule.startDate,
        endDate: rule.endDate,
        nextDate: rule.nextDate,
        recurringPattern: rule.recurringPattern,
      },
    });
    if (score < CANDIDATE_MIN_THRESHOLD) return undefined;
    return {
      transactionId: transaction.id,
      transactionDate: transaction.date,
      transactionDescription: transaction.description,
      transactionAmount: transaction.amount,
      transactionAccountId: transaction.accountId,
      recurringId: rule.id,
      recurringName: rule.name,
      score,
    };
  }
}
