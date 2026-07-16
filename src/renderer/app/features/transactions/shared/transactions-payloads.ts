import type { RecurringFrequency, TransactionCategory } from '@shared/enums';
import type {
  CreateRecurring,
  CreateTransaction,
  RecurringPattern,
  Transaction,
  TransactionTemplate,
  UpdateRecurring,
  UUID,
} from '@shared/types';
import type { RecurringFormModel } from '@/features/recurring/pages/recurring-form/recurring-form';
import { fromDateInputValue } from './date-input.utils';
import type { TransactionFormModel } from '../pages/transactions-form/transactions-form';

/** Converte o modelo do form no payload de `transactions:create`/`save`. */
export function buildCreateTransaction(model: TransactionFormModel): CreateTransaction {
  return {
    accountId: model.accountId as UUID,
    type: model.type,
    category: model.category as TransactionCategory,
    amount: model.amount,
    description: model.description,
    date: fromDateInputValue(model.date),
    tags: [],
  };
}

/** Pattern simples desta entrega: `startDate` ancora o dia do mês/semana. */
function buildPattern(frequency: RecurringFrequency, anchor: Date): RecurringPattern {
  const anchorsMonth = frequency === 'monthly' || frequency === 'yearly';
  return {
    frequency,
    interval: 1,
    businessDaysOnly: false,
    timezone: 'America/Sao_Paulo',
    ...(anchorsMonth ? { dayOfMonth: anchor.getDate() } : {}),
    ...(frequency === 'weekly' ? { dayOfWeek: anchor.getDay() } : {}),
  };
}

function buildTemplate(model: TransactionFormModel | RecurringFormModel): TransactionTemplate {
  return {
    accountId: model.accountId as UUID,
    type: model.type,
    category: model.category as TransactionCategory,
    amount: model.amount,
    description: model.description,
  };
}

/**
 * Converte o modelo do form de transação (toggle "Repetir" ativo) no payload
 * de `recurring:create`: a data da transação vira o startDate.
 */
export function buildCreateRecurring(model: TransactionFormModel): CreateRecurring {
  const startDate = fromDateInputValue(model.date);
  return {
    type: 'transaction',
    name: model.description,
    template: buildTemplate(model),
    recurringPattern: buildPattern(model.frequency, startDate),
    startDate,
    ...(model.endDate ? { endDate: fromDateInputValue(model.endDate) } : {}),
  };
}

/** Payload de `recurring:update`; `endDate: null` limpa a data fim. */
export function buildUpdateRecurring(model: RecurringFormModel): UpdateRecurring {
  const startDate = fromDateInputValue(model.startDate);
  return {
    name: model.name,
    template: buildTemplate(model),
    recurringPattern: buildPattern(model.frequency, startDate),
    startDate,
    endDate: model.endDate ? fromDateInputValue(model.endDate) : null,
  };
}

/** Converte o modelo do recurring-form (criação) no payload de `recurring:create`. */
export function buildCreateRecurringFromRule(model: RecurringFormModel): CreateRecurring {
  const startDate = fromDateInputValue(model.startDate);
  return {
    type: 'transaction',
    name: model.name,
    template: buildTemplate(model),
    recurringPattern: buildPattern(model.frequency, startDate),
    startDate,
    ...(model.endDate ? { endDate: fromDateInputValue(model.endDate) } : {}),
  };
}

/**
 * Query params do fluxo "Criar recorrência a partir desta transação"
 * (transactions-form/-view -> `/recurring/new`). As chaves batem exatamente
 * com o que `RecurringForm#buildInitialModel` lê.
 */
export function buildRecurringPrefillParams(
  source: Pick<Transaction, 'accountId' | 'type' | 'category' | 'amount' | 'description'>,
): Record<string, string> {
  return {
    accountId: source.accountId,
    type: source.type,
    category: source.category,
    amount: source.amount,
    description: source.description,
  };
}
