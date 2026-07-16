import type { TransactionType } from '@shared/enums';
import { bestAutoLinkCandidate, computeRecurrenceProbability } from '@shared/recurrence/matching';
import type { TransactionTemplate } from '@shared/types';
import type { schema } from '../../database/database.module';
import { ruleToMatchRule } from '../recurring/recurrence-match-input';

/** Linha do extrato (ou já inserida) candidata a casar com uma recorrência. */
export interface AutoLinkCandidateLine {
  readonly accountId: string;
  readonly type: TransactionType;
  readonly description: string;
  readonly amount: string;
  readonly date: Date;
}

/**
 * Melhor regra elegível para vínculo automático do import, restrita às
 * regras da MESMA conta da linha — mais estrito que o matching geral
 * (`RecurrenceMatchingService`, que só penaliza conta divergente): o
 * auto-link do import nunca deve cruzar contas sem confirmação humana.
 */
export function bestSameAccountRule(
  line: AutoLinkCandidateLine,
  rules: readonly schema.Recurring[],
): schema.Recurring | undefined {
  const sameAccount = rules.filter(
    (rule) => (rule.template as TransactionTemplate).accountId === line.accountId,
  );
  const scored = sameAccount.map((rule) => ({
    value: rule,
    score: computeRecurrenceProbability({
      transactionDescription: line.description,
      transactionAmount: line.amount,
      transactionDate: line.date,
      transactionType: line.type,
      transactionAccountId: line.accountId,
      recurring: ruleToMatchRule(rule),
    }),
  }));
  return bestAutoLinkCandidate(scored);
}
