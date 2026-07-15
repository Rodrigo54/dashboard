import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { computed, effect, inject, Injectable, Signal, WritableSignal } from '@angular/core';
import type { FieldState } from '@angular/forms/signals';
import { CURRENCY_SYMBOLS, type EnumOption, type TransactionType } from '@shared/enums';
import { TransactionsService } from './transactions.service';

/**
 * Campos mínimos que um form precisa expor pra usar
 * {@link TransactionFormFieldsService} — `TransactionFormModel` e
 * `RecurringFormModel` batem estruturalmente, sem precisar de `extends`.
 */
export interface TransactionCoreFields {
  accountId: string;
  type: Exclude<TransactionType, 'transfer'>;
  category: string;
}

/** Primeira mensagem de erro de um campo, só depois de tocado (vazia caso ok). */
export function fieldErrorOf(field: FieldState<string>): string {
  if (!field.touched()) return '';
  return field.errors()[0]?.message ?? '';
}

/**
 * Campos derivados compartilhados por transactions-form e recurring-form:
 * moeda da conta selecionada, categorias compatíveis com o tipo, a lista de
 * contas do select e o reset de categoria ao trocar o tipo.
 */
@Injectable({ providedIn: 'root' })
export class TransactionFormFieldsService {
  readonly #accounts = inject(AccountsService);
  readonly #transactions = inject(TransactionsService);

  /** Símbolo da moeda da conta selecionada (R$ enquanto nenhuma escolhida). */
  currencySymbol<T extends TransactionCoreFields>(model: Signal<T>): Signal<string> {
    return computed(() => {
      const account = this.#accounts.accounts.value()?.find((a) => a.id === model().accountId);
      const currency = (account?.currency ?? 'BRL') as keyof typeof CURRENCY_SYMBOLS;
      return CURRENCY_SYMBOLS[currency] ?? 'R$';
    });
  }

  /** Categorias compatíveis com o tipo selecionado. */
  categoryOptions<T extends TransactionCoreFields>(model: Signal<T>): Signal<EnumOption[]> {
    return computed(() => {
      const groups = this.#transactions.categories.value();
      return (model().type === 'income' ? groups?.income : groups?.expense) ?? [];
    });
  }

  /** Contas como `{ value, label }` pro `app-select`. */
  accountItems(): Signal<EnumOption[]> {
    return computed(
      () => this.#accounts.accounts.value()?.map((a) => ({ value: a.id, label: a.name })) ?? [],
    );
  }

  /** Trocar o tipo invalida a categoria escolhida para o tipo anterior. */
  wireCategoryReset<T extends TransactionCoreFields>(model: WritableSignal<T>): void {
    effect(() => {
      const { type, category } = model();
      const groups = this.#transactions.categories.value();
      const valid = (type === 'income' ? groups?.income : groups?.expense) ?? [];
      if (category && groups && !valid.some((o) => o.value === category)) {
        model.update((m) => ({ ...m, category: '' }));
      }
    });
  }
}
