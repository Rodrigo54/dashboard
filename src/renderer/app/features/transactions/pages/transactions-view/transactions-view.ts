import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { RecurringService } from '@/features/recurring/shared/recurring.service';
import { FrameHeader } from '@/shared/frame/frame-header';
import { FrameHeaderButton } from '@/shared/frame/frame-header-button';
import { FramePaper } from '@/shared/frame/frame-paper';
import { HlmBadge } from '@/shared/spartan/badge';
import { HlmButton } from '@/shared/spartan/button';
import { HlmTableImports } from '@/shared/spartan/table';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucidePlus, lucideSquarePen, lucideUnlink } from '@ng-icons/lucide';
import { addDecimal, negateDecimal } from '@shared/decimal';
import type {
  Recurring,
  RecurrenceMatchCandidate,
  Transaction,
  TransactionTemplate,
  UUID,
} from '@shared/types';
import { LedgerInvalidationService } from '../../shared/ledger-invalidation.service';
import { RecurringRuleSummary } from '../../shared/recurring-rule-summary';
import { buildRecurringPrefillParams } from '../../shared/transactions-payloads';
import { TransactionsService, type CategoryOptions } from '../../shared/transactions.service';
import { nextOccurrences } from '../transactions-list/recurring-forecast';

@Component({
  selector: 'app-transactions-view',
  imports: [
    FrameHeader,
    FrameHeaderButton,
    FramePaper,
    RouterLink,
    NgIcon,
    HlmButton,
    HlmBadge,
    ...HlmTableImports,
    RecurringRuleSummary,
    CurrencyPipe,
    DatePipe,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucidePlus, lucideSquarePen, lucideUnlink })],
  template: `
    <div>
      <app-frame-header>
        <ng-icon slot="icon" name="lucideSquarePen" class="text-[length:--spacing(12)]" />
        <h1 slot="title">{{ transaction()?.description ?? 'Transação' }}</h1>
        <p slot="subtitle">Detalhes do lançamento</p>
        <div slot="actions" class="flex gap-2">
          <button appFrameHeaderButton routerLink="/transactions">
            <ng-icon name="lucideArrowLeft" class="text-[length:--spacing(3.5)]" />
            Voltar
          </button>
          @if (transaction(); as t) {
            <button appFrameHeaderButton [routerLink]="['/transactions/edit', t.id]">
              <ng-icon name="lucideSquarePen" class="text-[length:--spacing(3.5)]" />
              Editar
            </button>
          }
        </div>
      </app-frame-header>
      <app-frame-paper>
        @if (transaction(); as t) {
          <div class="grid grid-cols-4 gap-6">
            <div>
              <p class="text-muted-foreground text-sm">Data</p>
              <p class="font-medium">{{ t.date | date: 'dd/MM/yyyy' }}</p>
            </div>
            <div>
              <p class="text-muted-foreground text-sm">Conta</p>
              <p class="font-medium">{{ accountName() }}</p>
            </div>
            <div>
              <p class="text-muted-foreground text-sm">Categoria</p>
              <p class="font-medium">{{ categoryLabel() }}</p>
            </div>
            <div>
              <p class="text-muted-foreground text-sm">Valor</p>
              <p
                class="font-medium"
                [class]="t.type === 'income' ? 'text-emerald-600' : 'text-destructive'"
              >
                {{ signedAmount() | currency: accountCurrency() }}
              </p>
            </div>
          </div>

          <div class="mt-8">
            @if (rule(); as r) {
              <app-recurring-rule-summary [rule]="r" />
              <div class="mt-3 flex gap-2">
                <button hlmBtn variant="outline" size="sm" [routerLink]="['/recurring/edit', r.id]">
                  <ng-icon name="lucideSquarePen" class="text-[length:--spacing(3.5)]" />
                  Editar recorrência
                </button>
                <button hlmBtn variant="outline" size="sm" (click)="unlink()">
                  <ng-icon name="lucideUnlink" class="text-[length:--spacing(3.5)]" />
                  Desvincular desta recorrência
                </button>
              </div>

              <div class="mt-8 grid grid-cols-2 gap-8">
                <div>
                  <h2 class="mb-3 font-semibold">Últimos lançamentos</h2>
                  @if (recentTransactionsDisplay().length) {
                    <ul class="flex flex-col gap-2">
                      @for (item of recentTransactionsDisplay(); track item.id) {
                        <li class="text-muted-foreground flex justify-between text-sm">
                          <span>{{ item.date | date: 'dd/MM/yyyy' }}</span>
                          <span>{{ signedAmountOf(item) | currency: accountCurrency() }}</span>
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="text-muted-foreground text-sm">Nenhum outro lançamento ainda.</p>
                  }
                </div>
                <div>
                  <h2 class="mb-3 font-semibold">Próximas previsões</h2>
                  @if (upcoming().length) {
                    <ul class="flex flex-col gap-2">
                      @for (date of upcoming(); track date.getTime()) {
                        <li class="text-muted-foreground flex justify-between text-sm">
                          <span>{{ date | date: 'dd/MM/yyyy' }}</span>
                          <span>{{ upcomingSignedAmount() | currency: accountCurrency() }}</span>
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="text-muted-foreground text-sm">Sem previsões futuras.</p>
                  }
                </div>
                <div
                  class="border-border text-foreground flex justify-between border-t pt-2 text-sm font-medium"
                >
                  @if (recentTransactionsDisplay().length) {
                    <span>Total lançado desde o início</span>
                    <span>{{ recentTotal() | currency: accountCurrency() }}</span>
                  }
                </div>
                <div
                  class="border-border text-foreground flex justify-between border-t pt-2 text-sm font-medium"
                >
                  @if (upcomingTotal() !== null) {
                    <span>Total restante até o término</span>
                    <span>{{ upcomingTotal() | currency: accountCurrency() }}</span>
                  }
                </div>
              </div>
            } @else {
              <button appFrameHeaderButton (click)="createRecurring()">
                <ng-icon name="lucidePlus" class="text-[length:--spacing(3.5)]" />
                Criar recorrência a partir desta transação
              </button>

              @if (candidates().length) {
                <div class="mt-6">
                  <h2 class="mb-3 font-semibold">Pode pertencer a uma recorrência existente</h2>
                  <table hlmTable>
                    <thead hlmTHead>
                      <tr hlmTr>
                        <th hlmTh>Recorrência</th>
                        <th hlmTh class="text-center!">Confiança</th>
                        <th hlmTh class="text-center!">Ações</th>
                      </tr>
                    </thead>
                    <tbody hlmTBody>
                      @for (candidate of candidates(); track candidate.recurringId) {
                        <tr hlmTr>
                          <td hlmTd>{{ candidate.recurringName }}</td>
                          <td hlmTd class="text-center">
                            <span hlmBadge variant="outline">{{ scorePercent(candidate) }}%</span>
                          </td>
                          <td hlmTd class="text-center">
                            <button hlmBtn variant="ghost" size="sm" (click)="link(candidate)">
                              Vincular
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            }
          </div>
        }
      </app-frame-paper>
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TransactionsView {
  protected readonly accountsService = inject(AccountsService);
  protected readonly recurringService = inject(RecurringService);
  readonly #transactionsService = inject(TransactionsService);
  readonly #ledgerInvalidation = inject(LedgerInvalidationService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);

  readonly #transactionId = this.#route.snapshot.paramMap.get('transactionId') as UUID;

  protected readonly transaction = signal<Transaction | undefined>(undefined);
  protected readonly rule = signal<Recurring | undefined>(undefined);
  protected readonly recentTransactions = signal<Transaction[]>([]);
  protected readonly candidates = signal<RecurrenceMatchCandidate[]>([]);

  protected readonly upcoming = computed(() => {
    const r = this.rule();
    return r ? nextOccurrences(r, this.recentTransactions(), 5) : [];
  });

  /** Só as 5 mais recentes na lista — o total abaixo soma o histórico inteiro. */
  protected readonly recentTransactionsDisplay = computed(() =>
    this.recentTransactions().slice(0, 5),
  );

  /** Soma de tudo que já foi lançado desta regra desde o início, com sinal. */
  protected readonly recentTotal = computed(() =>
    this.recentTransactions().reduce(
      (total, t) => addDecimal(total, this.signedAmountOf(t)),
      '0.00',
    ),
  );

  /** Valor de cada ocorrência prevista, com sinal — todas compartilham o template da regra. */
  protected readonly upcomingSignedAmount = computed(() => {
    const r = this.rule();
    if (!r) return '0.00';
    const template = r.template as TransactionTemplate;
    return template.type === 'expense' ? negateDecimal(template.amount) : template.amount;
  });

  /**
   * Soma de todas as ocorrências ainda não materializadas até o término da
   * regra — `null` quando a regra não tem `endDate` (não dá pra totalizar um
   * horizonte indefinido).
   */
  protected readonly upcomingTotal = computed(() => {
    const r = this.rule();
    if (!r?.endDate) return null;

    const perOccurrence = this.upcomingSignedAmount();
    const remaining = nextOccurrences(r, this.recentTransactions(), Number.POSITIVE_INFINITY);
    return remaining.reduce((total) => addDecimal(total, perOccurrence), '0.00');
  });

  protected readonly accountName = computed(
    () =>
      this.accountsService.accounts.value()?.find((a) => a.id === this.transaction()?.accountId)
        ?.name ?? '—',
  );

  protected readonly accountCurrency = computed(
    () =>
      this.accountsService.accounts.value()?.find((a) => a.id === this.transaction()?.accountId)
        ?.currency ?? 'BRL',
  );

  protected readonly categoryLabel = computed(() => {
    const t = this.transaction();
    if (!t) return '';
    const groups = this.#transactionsService.categories.value() as CategoryOptions | undefined;
    const options = t.type === 'income' ? groups?.income : groups?.expense;
    return options?.find((o) => o.value === t.category)?.label ?? t.category;
  });

  protected readonly signedAmount = computed(() => {
    const t = this.transaction();
    if (!t) return '0';
    return this.signedAmountOf(t);
  });

  /** Valor com sinal para exibição: despesas aparecem negativas. */
  protected signedAmountOf(transaction: Transaction): string {
    return transaction.type === 'expense' ? `-${transaction.amount}` : transaction.amount;
  }

  constructor() {
    void this.#load();
  }

  async #load(): Promise<void> {
    const transaction = await this.#transactionsService.findOne(this.#transactionId);
    this.transaction.set(transaction);

    if (transaction.recurringId) {
      const [rule, recent] = await Promise.all([
        this.recurringService.findOne(transaction.recurringId),
        this.#transactionsService.byRecurring(transaction.recurringId),
      ]);
      this.rule.set(rule);
      this.recentTransactions.set(recent);
      this.candidates.set([]);
    } else {
      this.rule.set(undefined);
      this.recentTransactions.set([]);
      this.candidates.set(
        await this.recurringService.matchCandidatesForTransaction(this.#transactionId),
      );
    }
  }

  protected scorePercent(candidate: RecurrenceMatchCandidate): number {
    return Math.round(candidate.score * 100);
  }

  protected async unlink(): Promise<void> {
    await this.recurringService.unlinkTransaction(this.#transactionId);
    this.#ledgerInvalidation.reloadRules();
    this.#ledgerInvalidation.reloadBalanceAffectingData();
    await this.#load();
  }

  protected async link(candidate: RecurrenceMatchCandidate): Promise<void> {
    await this.recurringService.linkTransaction(this.#transactionId, candidate.recurringId);
    this.#ledgerInvalidation.reloadRules();
    this.#ledgerInvalidation.reloadBalanceAffectingData();
    await this.#load();
  }

  protected async createRecurring(): Promise<void> {
    const t = this.transaction();
    if (!t) return;
    await this.#router.navigate(['/recurring/new'], {
      queryParams: buildRecurringPrefillParams(t),
    });
  }
}
