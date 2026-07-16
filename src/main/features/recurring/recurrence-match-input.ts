import type { RecurrenceMatchInput } from '@shared/recurrence/matching';
import type { TransactionTemplate } from '@shared/types';
import type { schema } from '../../database/database.module';

/**
 * Converte uma linha de `recurring` no formato que `computeRecurrenceProbability`
 * espera. Extraído porque três consumidores (matching geral, preview e commit
 * de import) montam exatamente essa mesma transformação.
 */
export function ruleToMatchRule(rule: schema.Recurring): RecurrenceMatchInput['recurring'] {
  const template = rule.template as TransactionTemplate;
  return {
    name: rule.name,
    templateDescription: template.description,
    templateAmount: template.amount,
    templateType: template.type,
    templateAccountId: template.accountId,
    startDate: rule.startDate,
    endDate: rule.endDate,
    nextDate: rule.nextDate,
    recurringPattern: rule.recurringPattern,
  };
}
