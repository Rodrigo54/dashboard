import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { RecurringService } from '@/features/recurring/shared/recurring.service';
import { HlmButton } from '@/shared/spartan/button';
import { HlmEmptyImports } from '@/shared/spartan/empty';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideChevronLeft,
  lucideChevronRight,
  lucidePlus,
  lucideRepeat,
} from '@ng-icons/lucide';
import { SelectComponent } from '@/shared/select';
import { HlmTableImports } from '@/shared/spartan/table';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { TransactionType } from '@shared/enums';
import type { UUID } from '@shared/types';
import { TransactionsService } from '../../shared/transactions.service';
import { byDateThenForecast, transactionToRow, type LedgerRow } from './ledger-row';
import { forecastRows } from './recurring-forecast';
import { TransactionRow } from './transaction-row';

type Scope = 'all' | 'recurring';

@Component({
  selector: 'app-transactions-table',
  host: { class: 'block w-full' },
  imports: [
    RouterLink,
    NgIcon,
    HlmButton,
    ...HlmEmptyImports,
    SelectComponent,
    ...HlmTableImports,
    TransactionRow,
  ],
  providers: [
    provideIcons({
      lucideArrowLeft,
      lucideChevronLeft,
      lucideChevronRight,
      lucidePlus,
      lucideRepeat,
    }),
  ],
  template: `
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div
          class="border-border bg-muted/40 inline-flex items-center gap-1 rounded-lg border p-1"
          role="group"
          aria-label="Filtrar lançamentos"
        >
          <button
            hlmBtn
            size="sm"
            [variant]="scope() === 'all' ? 'secondary' : 'ghost'"
            [attr.aria-pressed]="scope() === 'all'"
            (click)="scope.set('all')"
          >
            Tudo
          </button>
          <button
            hlmBtn
            size="sm"
            [variant]="scope() === 'recurring' ? 'secondary' : 'ghost'"
            [attr.aria-pressed]="scope() === 'recurring'"
            (click)="scope.set('recurring')"
          >
            <ng-icon name="lucideRepeat" class="text-[length:--spacing(3.5)]" />
            Recorrências
          </button>
        </div>
        <div class="bg-border h-6 w-px"></div>
        <div class="flex items-center gap-1">
          <button
            hlmBtn
            variant="ghost"
            size="sm"
            [disabled]="service.isCurrentMonth()"
            (click)="service.goToToday()"
            aria-label="Voltar para o mês atual"
          >
            <ng-icon name="lucideArrowLeft" class="text-[length:--spacing(3.5)]" />
            Hoje
          </button>
          <button
            hlmBtn
            variant="ghost"
            size="icon-sm"
            (click)="service.previousMonth()"
            aria-label="Mês anterior"
          >
            <ng-icon name="lucideChevronLeft" class="text-[length:--spacing(3.5)]" />
          </button>
          <button
            hlmBtn
            variant="ghost"
            size="icon-sm"
            (click)="service.nextMonth()"
            aria-label="Próximo mês"
          >
            <ng-icon name="lucideChevronRight" class="text-[length:--spacing(3.5)]" />
          </button>
          <span class="ml-2 text-base font-semibold capitalize">{{ service.monthLabel() }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <app-select
          class="w-44"
          [items]="accountFilterItems()"
          placeholder="Todas as contas"
          (valueChange)="onAccountFilter($event)"
        />
        <app-select
          class="w-36"
          [items]="typeFilterItems()"
          placeholder="Todos os tipos"
          (valueChange)="onTypeFilter($event)"
        />
      </div>
    </div>

    @if (isLoading()) {
      <p class="text-muted-foreground py-8 text-center">Carregando lançamentos...</p>
    } @else if (hasError()) {
      <p class="text-destructive py-8 text-center">Não foi possível carregar os lançamentos.</p>
    } @else if (!rows().length) {
      <hlm-empty>
        <hlm-empty-header>
          <h3 hlmEmptyTitle>{{ emptyTitle() }}</h3>
          <p hlmEmptyDescription>{{ emptyDescription() }}</p>
        </hlm-empty-header>
        <hlm-empty-content>
          <button hlmBtn variant="default" routerLink="/transactions/new">
            Nova Transação
            <ng-icon name="lucidePlus" class="text-[length:--spacing(3.5)]" />
          </button>
        </hlm-empty-content>
      </hlm-empty>
    } @else {
      <table hlmTable>
        <thead hlmTHead>
          <tr hlmTr>
            <th hlmTh>Data</th>
            <th hlmTh>Descrição</th>
            <th hlmTh>Conta</th>
            <th hlmTh>Categoria</th>
            <th hlmTh class="text-right!">Valor</th>
            <th hlmTh class="text-center!">Ações</th>
          </tr>
        </thead>
        <tbody hlmTBody>
          @for (row of rows(); track row.key) {
            <tr appTransactionRow hlmTr [row]="row"></tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsTable {
  protected readonly service = inject(TransactionsService);
  protected readonly recurringService = inject(RecurringService);
  protected readonly accountsService = inject(AccountsService);

  protected readonly scope = signal<Scope>('all');

  /** Contas do filtro, com a opção "Todas as contas" à frente. */
  protected readonly accountFilterItems = computed(() => [
    { value: 'all', label: 'Todas as contas' },
    ...(this.accountsService.accounts.value()?.map((a) => ({ value: a.id, label: a.name })) ?? []),
  ]);

  /** Tipos do filtro, com a opção "Todos os tipos" à frente. */
  protected readonly typeFilterItems = computed(() => [
    { value: 'all', label: 'Todos os tipos' },
    ...(this.service.types.value() ?? []),
  ]);

  /**
   * Extrato unificado, sempre com transações e previsões das regras. Em "Tudo"
   * lista todas as transações; em "Recorrências", apenas as originadas de regra.
   */
  protected readonly rows = computed<LedgerRow[]>(() => {
    const transactions = this.service.transactions.value() ?? [];
    const base = transactions.map(transactionToRow);
    const real = this.scope() === 'recurring' ? base.filter((row) => row.recurring) : base;

    const forecasts = forecastRows(this.recurringService.rules.value() ?? [], transactions, {
      year: this.service.year(),
      month: this.service.month(),
      accountId: this.service.accountFilter(),
      type: this.service.typeFilter(),
    });
    return [...real, ...forecasts].sort(byDateThenForecast);
  });

  protected readonly isLoading = computed(
    () => this.service.transactions.isLoading() || this.recurringService.rules.isLoading(),
  );

  protected readonly hasError = computed(
    () => !!this.service.transactions.error() || !!this.recurringService.rules.error(),
  );

  protected readonly emptyTitle = computed(() =>
    this.scope() === 'recurring' ? 'Nenhuma recorrência neste mês' : 'Nenhuma transação neste mês',
  );

  protected readonly emptyDescription = computed(() =>
    this.scope() === 'recurring'
      ? 'Crie uma transação com a opção “Repetir” ativa para ver as previsões aqui.'
      : 'Registre uma receita ou despesa para vê-la aqui.',
  );

  protected onAccountFilter(value: string | undefined): void {
    this.service.accountFilter.set(value === 'all' ? undefined : (value as UUID));
  }

  protected onTypeFilter(value: string | undefined): void {
    this.service.typeFilter.set(value === 'all' ? undefined : (value as TransactionType));
  }
}
