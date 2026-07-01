import { AccountsService } from '@/features/accounts/accounts.service';
import { ZardBadgeComponent } from '@/shared/ui/zard/components/badge/badge.component';
import { ZardButtonComponent } from '@/shared/ui/zard/components/button/button.component';
import { ZardEmptyComponent } from '@/shared/ui/zard/components/empty';
import { ZardIconComponent } from '@/shared/ui/zard/components/icon/icon.component';
import { ZardSelectImports } from '@/shared/ui/zard/components/select';
import { ZardTableImports } from '@/shared/ui/zard/components/table';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { TransactionType } from '@shared/enums';
import type { Recurring, Transaction, UUID } from '@shared/types';
import { byDateThenForecast, transactionToRow, type LedgerRow } from './ledger-row';
import { forecastRows } from './recurring-forecast';
import { RecurringService } from './recurring.service';
import { TransactionsService } from './transactions.service';

type Scope = 'all' | 'recurring';

@Component({
  selector: 'app-transactions-table',
  host: { class: 'block w-full' },
  imports: [
    RouterLink,
    ZardIconComponent,
    ZardButtonComponent,
    ZardBadgeComponent,
    ZardEmptyComponent,
    CurrencyPipe,
    DatePipe,
    ...ZardSelectImports,
    ...ZardTableImports,
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
            z-button
            zSize="sm"
            [zType]="scope() === 'all' ? 'secondary' : 'ghost'"
            [attr.aria-pressed]="scope() === 'all'"
            (click)="scope.set('all')"
          >
            Tudo
          </button>
          <button
            z-button
            zSize="sm"
            [zType]="scope() === 'recurring' ? 'secondary' : 'ghost'"
            [attr.aria-pressed]="scope() === 'recurring'"
            (click)="scope.set('recurring')"
          >
            <i z-icon zType="repeat"></i>
            Recorrências
          </button>
        </div>
        <div class="bg-border h-6 w-px"></div>
        <div class="flex items-center gap-1">
          <button
            z-button
            zType="ghost"
            zSize="sm"
            [disabled]="service.isCurrentMonth()"
            (click)="service.goToToday()"
            aria-label="Voltar para o mês atual"
          >
            <i z-icon zType="arrow-left"></i>
            Hoje
          </button>
          <button
            z-button
            zType="ghost"
            zSize="sm"
            (click)="service.previousMonth()"
            aria-label="Mês anterior"
          >
            <i z-icon zType="chevron-left"></i>
          </button>
          <button
            z-button
            zType="ghost"
            zSize="sm"
            (click)="service.nextMonth()"
            aria-label="Próximo mês"
          >
            <i z-icon zType="chevron-right"></i>
          </button>
          <span class="ml-2 text-base font-semibold capitalize">{{ service.monthLabel() }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <z-select
          class="w-44"
          zPlaceholder="Todas as contas"
          (zSelectionChange)="onAccountFilter($event)"
        >
          <z-select-item zValue="">Todas as contas</z-select-item>
          @for (account of accountsService.accounts.value(); track account.id) {
            <z-select-item [zValue]="account.id">{{ account.name }}</z-select-item>
          }
        </z-select>
        <z-select
          class="w-36"
          zPlaceholder="Todos os tipos"
          (zSelectionChange)="onTypeFilter($event)"
        >
          <z-select-item zValue="">Todos os tipos</z-select-item>
          @for (type of service.types.value(); track type.value) {
            <z-select-item [zValue]="type.value">{{ type.label }}</z-select-item>
          }
        </z-select>
      </div>
    </div>

    @if (isLoading()) {
      <p class="text-muted-foreground py-8 text-center">Carregando lançamentos...</p>
    } @else if (hasError()) {
      <p class="text-destructive py-8 text-center">Não foi possível carregar os lançamentos.</p>
    } @else if (!rows().length) {
      <z-empty
        [zTitle]="emptyTitle()"
        [zDescription]="emptyDescription()"
        [zActions]="[addAction]"
      ></z-empty>
      <ng-template #addAction>
        <button z-button zType="default" routerLink="/transactions/new">
          Nova Transação
          <i z-icon zType="plus"></i>
        </button>
      </ng-template>
    } @else {
      <table z-table>
        <thead z-table-header>
          <tr z-table-row>
            <th z-table-head>Data</th>
            <th z-table-head>Descrição</th>
            <th z-table-head>Conta</th>
            <th z-table-head>Categoria</th>
            <th z-table-head class="text-right">Valor</th>
            <th z-table-head class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody z-table-body>
          @for (row of rows(); track row.key) {
            <tr z-table-row [class]="row.kind === 'forecast' ? 'bg-muted/20' : ''">
              <td z-table-cell class="tabular-nums" [class]="dateCellClass(row)">
                {{ row.date | date: 'dd/MM/yyyy' }}
              </td>
              <td z-table-cell class="font-medium">
                <span class="flex items-center gap-2">
                  {{ row.description }}
                  @if (row.kind === 'forecast') {
                    <z-badge [zType]="row.ruleStatus === 'paused' ? 'secondary' : 'outline'">
                      {{ row.ruleStatus === 'paused' ? 'Pausada' : 'Previsto' }}
                    </z-badge>
                  } @else if (row.recurring) {
                    <i
                      z-icon
                      zType="repeat"
                      class="text-muted-foreground"
                      aria-label="Recorrente"
                    ></i>
                  }
                </span>
              </td>
              <td z-table-cell [class.text-muted-foreground]="row.kind === 'forecast'">
                {{ accountName(row.accountId) }}
              </td>
              <td z-table-cell [class.text-muted-foreground]="row.kind === 'forecast'">
                {{ categoryLabel(row) }}
              </td>
              <td z-table-cell class="text-right tabular-nums" [class]="amountClass(row)">
                {{ signedAmount(row) | currency: accountCurrency(row.accountId) }}
              </td>
              <td z-table-cell>
                <div class="flex flex-row items-center justify-end gap-2">
                  @if (row.kind === 'forecast' && row.rule; as rule) {
                    @if (rule.status === 'active') {
                      <button
                        z-button
                        zType="ghost"
                        zSize="sm"
                        (click)="materialize(row)"
                        aria-label="Lançar agora"
                      >
                        <i z-icon zType="circle-check"></i>
                      </button>
                      <button
                        z-button
                        zType="ghost"
                        zSize="sm"
                        (click)="pause(rule)"
                        aria-label="Pausar recorrência"
                      >
                        <i z-icon zType="pause"></i>
                      </button>
                    } @else {
                      <button
                        z-button
                        zType="ghost"
                        zSize="sm"
                        (click)="resume(rule)"
                        aria-label="Retomar recorrência"
                      >
                        <i z-icon zType="play"></i>
                      </button>
                    }
                    <button
                      z-button
                      zType="ghost"
                      zSize="sm"
                      [routerLink]="['/transactions/recurring', rule.id]"
                      aria-label="Editar recorrência"
                    >
                      <i z-icon zType="square-pen"></i>
                    </button>
                  } @else if (row.transaction; as transaction) {
                    <button
                      z-button
                      zType="ghost"
                      zSize="sm"
                      [routerLink]="['/transactions', transaction.id]"
                      aria-label="Editar transação"
                    >
                      <i z-icon zType="square-pen"></i>
                    </button>
                    <button
                      z-button
                      zType="ghost"
                      zSize="sm"
                      (click)="remove(transaction)"
                      aria-label="Apagar transação"
                    >
                      <i z-icon zType="trash" class="text-destructive"></i>
                    </button>
                  }
                </div>
              </td>
            </tr>
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

  /** Extrato unificado: transações do mês e, no filtro de recorrência, as previsões das regras. */
  protected readonly rows = computed<LedgerRow[]>(() => {
    const transactions = this.service.transactions.value() ?? [];
    const base = transactions.map(transactionToRow);
    if (this.scope() === 'all') return base;

    const created = base.filter((row) => row.recurring);
    const forecasts = forecastRows(this.recurringService.rules.value() ?? [], transactions, {
      year: this.service.year(),
      month: this.service.month(),
      accountId: this.service.accountFilter(),
      type: this.service.typeFilter(),
    });
    return [...created, ...forecasts].sort(byDateThenForecast);
  });

  protected readonly isLoading = computed(
    () =>
      this.service.transactions.isLoading() ||
      (this.scope() === 'recurring' && this.recurringService.rules.isLoading()),
  );

  protected readonly hasError = computed(
    () =>
      !!this.service.transactions.error() ||
      (this.scope() === 'recurring' && !!this.recurringService.rules.error()),
  );

  protected readonly emptyTitle = computed(() =>
    this.scope() === 'recurring' ? 'Nenhuma recorrência neste mês' : 'Nenhuma transação neste mês',
  );

  protected readonly emptyDescription = computed(() =>
    this.scope() === 'recurring'
      ? 'Crie uma transação com a opção “Repetir” ativa para ver as previsões aqui.'
      : 'Registre uma receita ou despesa para vê-la aqui.',
  );

  protected onAccountFilter(value: string | string[]): void {
    this.service.accountFilter.set((value as string) === '' ? undefined : (value as UUID));
  }

  protected onTypeFilter(value: string | string[]): void {
    this.service.typeFilter.set((value as string) === '' ? undefined : (value as TransactionType));
  }

  protected accountName(accountId: string): string {
    return this.accountsService.accounts.value()?.find((a) => a.id === accountId)?.name ?? '—';
  }

  protected accountCurrency(accountId: string): string {
    return (
      this.accountsService.accounts.value()?.find((a) => a.id === accountId)?.currency ?? 'BRL'
    );
  }

  protected categoryLabel(row: LedgerRow): string {
    const groups = this.service.categories.value();
    const options = row.type === 'income' ? groups?.income : groups?.expense;
    return options?.find((o) => o.value === row.category)?.label ?? row.category;
  }

  /** Valor com sinal para exibição: despesas aparecem negativas. */
  protected signedAmount(row: LedgerRow): string {
    return row.type === 'expense' ? `-${row.amount}` : row.amount;
  }

  protected amountClass(row: LedgerRow): string {
    if (row.kind === 'forecast') return 'text-muted-foreground';
    return row.type === 'income' ? 'text-emerald-600' : 'text-destructive';
  }

  protected dateCellClass(row: LedgerRow): string {
    return row.kind === 'forecast'
      ? 'border-muted-foreground/40 border-l-2 border-dashed pl-3 text-muted-foreground'
      : '';
  }

  /** Apaga a transação (revertendo o saldo no main) e recarrega lista + contas. */
  protected async remove(transaction: Transaction): Promise<void> {
    const confirmed = window.confirm(
      `Apagar a transação "${transaction.description}"? O saldo da conta será revertido.`,
    );
    if (!confirmed) return;
    await this.service.delete(transaction.id);
    this.service.transactions.reload();
    this.accountsService.accounts.reload();
  }

  protected async pause(rule: Recurring): Promise<void> {
    await this.recurringService.pause(rule.id);
    this.recurringService.rules.reload();
  }

  /** Antecipa a ocorrência prevista, criando a transação e atualizando saldo. */
  protected async materialize(row: LedgerRow): Promise<void> {
    if (!row.rule) return;
    await this.recurringService.materialize(row.rule.id, row.date);
    this.recurringService.rules.reload();
    this.service.transactions.reload();
    this.accountsService.accounts.reload();
  }

  /** Retomar pula o período pausado e pode materializar a ocorrência de hoje. */
  protected async resume(rule: Recurring): Promise<void> {
    await this.recurringService.resume(rule.id);
    this.recurringService.rules.reload();
    this.service.transactions.reload();
    this.accountsService.accounts.reload();
  }
}
