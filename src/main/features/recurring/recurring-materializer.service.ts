import { pendingOccurrences } from '@shared/recurrence';
import { transactionTemplateSchema } from '@shared/schemas';
import { and, eq } from 'drizzle-orm';
import type { DB } from '../../database/database.module';
import { getDb, schema } from '../../database/database.module';
import { AccountBalanceService } from '../accounts/account-balance.service';
import { Service } from '../../core/service.decorator';
import { inject } from '../../core/services.providers';

/**
 * Motor de materialização: converte regras de `recurring` (type `transaction`,
 * status `active`) em linhas concretas de `transactions`, fazendo catch-up de
 * todas as ocorrências vencidas. Disparado no login e após mutações de
 * recorrência — não há timer; o atraso é recuperado no próximo gatilho.
 */
@Service('recurring-materializer')
export class RecurringMaterializerService {
  private readonly balance = inject(AccountBalanceService);

  /** Materializa as recorrências vencidas do usuário. Retorna o total criado. */
  materializeRecurringTransactions(userId: string, now = new Date()): number {
    const db = getDb();
    const rules = db
      .select()
      .from(schema.recurring)
      .where(
        and(
          eq(schema.recurring.userId, userId),
          eq(schema.recurring.type, 'transaction'),
          eq(schema.recurring.status, 'active'),
          // Regras importadas (autoMaterialize=false) só aparecem como previsão;
          // suas ocorrências reais chegam pela importação, não pelo materializador.
          eq(schema.recurring.autoMaterialize, true),
        ),
      )
      .all();

    let created = 0;
    for (const rule of rules) {
      try {
        created += this.materializeRule(db, userId, rule, now);
      } catch (error) {
        // Uma regra quebrada (ex.: conta excluída) não pode travar as demais.
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[recurring] Falha ao materializar a regra ${rule.id}: ${message}`);
      }
    }
    return created;
  }

  /**
   * Materializa uma única regra ativa até `until` (inclusive), antecipando as
   * ocorrências previstas. Reaproveita o motor de catch-up, então a sequência de
   * `nextDate`/`executionCount` permanece consistente. Retorna o total criado.
   */
  materializeRuleUntil(userId: string, ruleId: string, until: Date): number {
    const db = getDb();
    const rule = db
      .select()
      .from(schema.recurring)
      .where(
        and(
          eq(schema.recurring.id, ruleId),
          eq(schema.recurring.userId, userId),
          eq(schema.recurring.type, 'transaction'),
        ),
      )
      .get();
    if (!rule) throw new Error('Recorrência não encontrada');
    if (rule.status !== 'active') {
      throw new Error('Apenas recorrências ativas podem ser lançadas');
    }
    return this.materializeRule(db, userId, rule, until);
  }

  private materializeRule(db: DB, userId: string, rule: schema.Recurring, now: Date): number {
    const { occurrences, nextDate } = pendingOccurrences(
      {
        startDate: rule.startDate,
        endDate: rule.endDate,
        nextDate: rule.nextDate,
        pattern: rule.recurringPattern,
      },
      now,
    );

    const completed = nextDate === null;
    const nextDateUnchanged = nextDate?.getTime() === rule.nextDate?.getTime();
    if (occurrences.length === 0 && !completed && nextDateUnchanged) return 0;

    const template = transactionTemplateSchema.parse(rule.template);

    db.transaction((tx) => {
      for (const date of occurrences) {
        tx.insert(schema.transactions)
          .values({
            userId,
            accountId: template.accountId,
            type: template.type,
            category: template.category,
            amount: template.amount,
            description: template.description,
            date,
            recurringId: rule.id,
          })
          .run();
        this.balance.applyBalanceDelta(
          tx,
          userId,
          template.accountId,
          this.balance.signedAmount(template.type, template.amount),
        );
      }

      tx.update(schema.recurring)
        .set({
          nextDate,
          executionCount: rule.executionCount + occurrences.length,
          ...(completed ? { status: 'completed' as const } : {}),
        })
        .where(eq(schema.recurring.id, rule.id))
        .run();
    });

    return occurrences.length;
  }
}
