import { invoke } from '@/core/ipc/invoke';
import { computed, Injectable, resource, signal } from '@angular/core';
import type { EnumOption, TransactionType } from '@shared/enums';
import type {
  CreateTransaction,
  ListTransactionsFilter,
  Transaction,
  UpdateTransaction,
  UUID,
} from '@shared/types';

/** Categorias agrupadas por tipo, como entregues por `transactions:categories`. */
export interface CategoryOptions {
  income: EnumOption[];
  expense: EnumOption[];
}

@Injectable({ providedIn: 'root' })
export class TransactionsService {
  readonly #today = new Date();

  /** Mês exibido na listagem (1-12) e filtros opcionais. */
  readonly year = signal(this.#today.getFullYear());
  readonly month = signal(this.#today.getMonth() + 1);
  readonly accountFilter = signal<UUID | undefined>(undefined);
  readonly typeFilter = signal<TransactionType | undefined>(undefined);

  readonly #filter = computed<ListTransactionsFilter>(() => ({
    year: this.year(),
    month: this.month(),
    ...(this.accountFilter() ? { accountId: this.accountFilter() } : {}),
    ...(this.typeFilter() ? { type: this.typeFilter() } : {}),
  }));

  /** Transações do mês filtrado; recarregue com `.reload()` após mutações. */
  readonly transactions = resource<Transaction[], ListTransactionsFilter>({
    params: this.#filter,
    loader: ({ params }) => invoke<Transaction[]>('transactions:list', params),
  });

  readonly types = resource<EnumOption[], unknown>({
    loader: () => invoke<EnumOption[]>('transactions:types'),
  });

  readonly categories = resource<CategoryOptions, unknown>({
    loader: () => invoke<CategoryOptions>('transactions:categories'),
  });

  /** Rótulo do mês exibido, ex.: "junho de 2026". */
  readonly monthLabel = computed(() =>
    new Date(this.year(), this.month() - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    }),
  );

  previousMonth(): void {
    const previous = new Date(this.year(), this.month() - 2, 1);
    this.year.set(previous.getFullYear());
    this.month.set(previous.getMonth() + 1);
  }

  nextMonth(): void {
    const next = new Date(this.year(), this.month(), 1);
    this.year.set(next.getFullYear());
    this.month.set(next.getMonth() + 1);
  }

  /** Volta a listagem para o mês atual. */
  goToToday(): void {
    const today = new Date();
    this.year.set(today.getFullYear());
    this.month.set(today.getMonth() + 1);
  }

  /** Verdadeiro quando o mês exibido é o mês atual. */
  readonly isCurrentMonth = computed(() => {
    const today = new Date();
    return this.year() === today.getFullYear() && this.month() === today.getMonth() + 1;
  });

  findOne(id: UUID): Promise<Transaction> {
    return invoke<Transaction>('transactions:read', id);
  }

  /** Upsert: cria quando `id` é omitido, atualiza quando informado. */
  save(data: CreateTransaction | UpdateTransaction, id?: UUID): Promise<Transaction> {
    return invoke<Transaction>('transactions:save', { id, data });
  }

  delete(id: UUID): Promise<{ id: UUID }> {
    return invoke<{ id: UUID }>('transactions:remove', id);
  }
}
