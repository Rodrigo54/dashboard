import { invoke } from '@/core/ipc/invoke';
import { computed, Injectable, resource, signal } from '@angular/core';
import type { EnumOption } from '@shared/enums';
import type {
  CreateRecurring,
  Recurring,
  RecurrenceMatchCandidate,
  UpdateRecurring,
  UUID,
} from '@shared/types';

/** Filtro de `recurring:matchCandidates`. */
interface MatchMonthFilter {
  readonly year: number;
  readonly month: number;
}

@Injectable({ providedIn: 'root' })
export class RecurringService {
  readonly #today = new Date();

  /** Regras de recorrência de transações; recarregue após mutações. */
  readonly rules = resource<Recurring[], unknown>({
    loader: () => invoke<Recurring[]>('recurring:list'),
  });

  readonly frequencies = resource<EnumOption[], unknown>({
    loader: () => invoke<EnumOption[]>('recurring:frequencies'),
  });

  /** Mês exibido na tela de detecção (1-12) — navegação igual à de transações. */
  readonly year = signal(this.#today.getFullYear());
  readonly month = signal(this.#today.getMonth() + 1);

  readonly #matchFilter = computed<MatchMonthFilter>(() => ({
    year: this.year(),
    month: this.month(),
  }));

  /** Candidatos de vínculo do mês exibido; recarregue com `.reload()` após confirmar/rejeitar. */
  readonly matchCandidates = resource<RecurrenceMatchCandidate[], MatchMonthFilter>({
    params: this.#matchFilter,
    loader: ({ params }) => invoke<RecurrenceMatchCandidate[]>('recurring:matchCandidates', params),
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

  /** Volta a tela para o mês atual. */
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

  /** Candidatos de vínculo de uma transação específica (transactions-view). */
  matchCandidatesForTransaction(transactionId: UUID): Promise<RecurrenceMatchCandidate[]> {
    return invoke<RecurrenceMatchCandidate[]>(
      'recurring:matchCandidatesForTransaction',
      transactionId,
    );
  }

  linkTransaction(transactionId: UUID, recurringId: UUID): Promise<{ transactionId: UUID }> {
    return invoke<{ transactionId: UUID }>('recurring:linkTransaction', {
      transactionId,
      recurringId,
    });
  }

  unlinkTransaction(transactionId: UUID): Promise<{ transactionId: UUID }> {
    return invoke<{ transactionId: UUID }>('recurring:unlinkTransaction', transactionId);
  }

  findOne(id: UUID): Promise<Recurring> {
    return invoke<Recurring>('recurring:read', id);
  }

  create(data: CreateRecurring): Promise<Recurring> {
    return invoke<Recurring>('recurring:create', data);
  }

  update(id: UUID, data: UpdateRecurring): Promise<Recurring> {
    return invoke<Recurring>('recurring:update', { id, data });
  }

  pause(id: UUID): Promise<Recurring> {
    return invoke<Recurring>('recurring:pause', id);
  }

  resume(id: UUID): Promise<Recurring> {
    return invoke<Recurring>('recurring:resume', id);
  }

  /** Antecipa a ocorrência prevista até `date`, criando a(s) transação(ões). */
  materialize(id: UUID, date: Date): Promise<{ id: UUID; created: number }> {
    return invoke<{ id: UUID; created: number }>('recurring:materialize', { id, date });
  }

  delete(id: UUID): Promise<{ id: UUID }> {
    return invoke<{ id: UUID }>('recurring:remove', id);
  }
}
