import type { ConfirmDetectedRecurrence, DetectedRecurrence } from '@shared/types';

/** Monta o payload de `import:confirm` a partir de uma sugestão detectada. */
export function toConfirmPayload(suggestion: DetectedRecurrence): ConfirmDetectedRecurrence {
  return {
    name: suggestion.description,
    template: {
      accountId: suggestion.accountId,
      type: suggestion.type,
      category: suggestion.category,
      amount: suggestion.averageAmount,
      description: suggestion.description,
    },
    recurringPattern: {
      frequency: suggestion.frequency,
      interval: suggestion.interval,
      businessDaysOnly: false,
      timezone: 'America/Sao_Paulo',
      ...(suggestion.dayOfMonth !== undefined ? { dayOfMonth: suggestion.dayOfMonth } : {}),
      ...(suggestion.dayOfWeek !== undefined ? { dayOfWeek: suggestion.dayOfWeek } : {}),
    },
    startDate: suggestion.startDate,
    transactionIds: suggestion.transactionIds,
  };
}
