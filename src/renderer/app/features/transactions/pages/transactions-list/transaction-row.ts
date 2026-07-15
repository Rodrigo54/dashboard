import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { HlmBadge } from '@/shared/spartan/badge';
import { HlmButton } from '@/shared/spartan/button';
import { HlmTableImports } from '@/shared/spartan/table';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleCheck,
  lucidePause,
  lucidePlay,
  lucideRepeat,
  lucideSquarePen,
  lucideTrash,
} from '@ng-icons/lucide';
import type { Recurring, Transaction } from '@shared/types';
import { LedgerInvalidationService } from '../../shared/ledger-invalidation.service';
import { RecurringService } from '../../shared/recurring.service';
import { TransactionsService } from '../../shared/transactions.service';
import type { LedgerRow } from './ledger-row';

/**
 * Uma linha do extrato unificado — transação real ou previsão de recorrência.
 * Dono da apresentação (classes, badge/ícone) e das ações (editar/apagar,
 * materializar/pausar/retomar) que dependem de `row.kind`.
 */
@Component({
  selector: 'tr[appTransactionRow]',
  host: { '[class]': 'rowClass()' },
  imports: [...HlmTableImports, HlmBadge, HlmButton, NgIcon, RouterLink, CurrencyPipe, DatePipe],
  providers: [
    provideIcons({
      lucideCircleCheck,
      lucidePause,
      lucidePlay,
      lucideRepeat,
      lucideSquarePen,
      lucideTrash,
    }),
  ],
  template: `
    <td hlmTd class="tabular-nums" [class]="dateCellClass()">
      {{ row().date | date: 'dd/MM/yyyy' }}
    </td>
    <td hlmTd class="font-medium">
      <span class="flex items-center gap-2">
        {{ row().description }}
        @if (row().kind === 'forecast') {
          <span hlmBadge [variant]="row().ruleStatus === 'paused' ? 'secondary' : 'outline'">
            {{ row().ruleStatus === 'paused' ? 'Pausada' : 'Previsto' }}
          </span>
        } @else if (row().recurring) {
          <ng-icon
            name="lucideRepeat"
            class="text-[length:--spacing(3.5)] text-muted-foreground"
            aria-label="Recorrente"
          />
        }
      </span>
    </td>
    <td hlmTd [class.text-muted-foreground]="row().kind === 'forecast'">
      {{ accountName() }}
    </td>
    <td hlmTd [class.text-muted-foreground]="row().kind === 'forecast'">
      {{ categoryLabel() }}
    </td>
    <td hlmTd class="text-right tabular-nums" [class]="amountClass()">
      {{ signedAmount() | currency: accountCurrency() }}
    </td>
    <td hlmTd>
      <div class="flex flex-row items-center justify-center gap-2">
        @if (row().kind === 'forecast' && row().rule; as rule) {
          @if (rule.status === 'active') {
            <button
              hlmBtn
              variant="ghost"
              size="icon-sm"
              (click)="materialize()"
              aria-label="Lançar agora"
            >
              <ng-icon name="lucideCircleCheck" class="text-[length:--spacing(3.5)]" />
            </button>
            <button
              hlmBtn
              variant="ghost"
              size="icon-sm"
              (click)="pause(rule)"
              aria-label="Pausar recorrência"
            >
              <ng-icon name="lucidePause" class="text-[length:--spacing(3.5)]" />
            </button>
          } @else {
            <button
              hlmBtn
              variant="ghost"
              size="icon-sm"
              (click)="resume(rule)"
              aria-label="Retomar recorrência"
            >
              <ng-icon name="lucidePlay" class="text-[length:--spacing(3.5)]" />
            </button>
          }
          <button
            hlmBtn
            variant="ghost"
            size="icon-sm"
            [routerLink]="['/transactions/recurring', rule.id]"
            aria-label="Editar recorrência"
          >
            <ng-icon name="lucideSquarePen" class="text-[length:--spacing(3.5)]" />
          </button>
        } @else if (row().transaction; as transaction) {
          <button
            hlmBtn
            variant="ghost"
            size="icon-sm"
            [routerLink]="['/transactions', transaction.id]"
            aria-label="Editar transação"
          >
            <ng-icon name="lucideSquarePen" class="text-[length:--spacing(3.5)]" />
          </button>
          <button
            hlmBtn
            variant="ghost"
            size="icon-sm"
            (click)="remove(transaction)"
            aria-label="Apagar transação"
          >
            <ng-icon name="lucideTrash" class="text-[length:--spacing(3.5)] text-destructive" />
          </button>
        }
      </div>
    </td>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionRow {
  readonly row = input.required<LedgerRow>();

  readonly #accountsService = inject(AccountsService);
  readonly #transactionsService = inject(TransactionsService);
  readonly #recurringService = inject(RecurringService);
  readonly #ledgerInvalidation = inject(LedgerInvalidationService);

  protected readonly rowClass = computed(() =>
    this.row().kind === 'forecast' ? 'bg-muted/20' : '',
  );

  protected readonly dateCellClass = computed(() =>
    this.row().kind === 'forecast'
      ? 'border-muted-foreground/40 border-l-2 border-dashed pl-3 text-muted-foreground'
      : '',
  );

  protected readonly amountClass = computed(() => {
    const row = this.row();
    if (row.kind === 'forecast') return 'text-muted-foreground';
    return row.type === 'income' ? 'text-emerald-600' : 'text-destructive';
  });

  protected readonly accountName = computed(
    () =>
      this.#accountsService.accounts.value()?.find((a) => a.id === this.row().accountId)?.name ??
      '—',
  );

  protected readonly accountCurrency = computed(
    () =>
      this.#accountsService.accounts.value()?.find((a) => a.id === this.row().accountId)
        ?.currency ?? 'BRL',
  );

  protected readonly categoryLabel = computed(() => {
    const row = this.row();
    const groups = this.#transactionsService.categories.value();
    const options = row.type === 'income' ? groups?.income : groups?.expense;
    return options?.find((o) => o.value === row.category)?.label ?? row.category;
  });

  /** Valor com sinal para exibição: despesas aparecem negativas. */
  protected readonly signedAmount = computed(() => {
    const row = this.row();
    return row.type === 'expense' ? `-${row.amount}` : row.amount;
  });

  /** Apaga a transação (revertendo o saldo no main) e recarrega lista + contas. */
  protected async remove(transaction: Transaction): Promise<void> {
    const confirmed = window.confirm(
      `Apagar a transação "${transaction.description}"? O saldo da conta será revertido.`,
    );
    if (!confirmed) return;
    await this.#transactionsService.delete(transaction.id);
    this.#ledgerInvalidation.reloadBalanceAffectingData();
  }

  protected async pause(rule: Recurring): Promise<void> {
    await this.#recurringService.pause(rule.id);
    this.#ledgerInvalidation.reloadRules();
  }

  /** Antecipa a ocorrência prevista, criando a transação e atualizando saldo. */
  protected async materialize(): Promise<void> {
    const row = this.row();
    if (!row.rule) return;
    await this.#recurringService.materialize(row.rule.id, row.date);
    this.#ledgerInvalidation.reloadRules();
    this.#ledgerInvalidation.reloadBalanceAffectingData();
  }

  /** Retomar pula o período pausado e pode materializar a ocorrência de hoje. */
  protected async resume(rule: Recurring): Promise<void> {
    await this.#recurringService.resume(rule.id);
    this.#ledgerInvalidation.reloadRules();
    this.#ledgerInvalidation.reloadBalanceAffectingData();
  }
}
