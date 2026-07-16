import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { FrameHeader } from '@/shared/frame/frame-header';
import { FrameHeaderButton } from '@/shared/frame/frame-header-button';
import { FramePaper } from '@/shared/frame/frame-paper';
import { HlmBadge } from '@/shared/spartan/badge';
import { HlmButton } from '@/shared/spartan/button';
import { HlmEmptyImports } from '@/shared/spartan/empty';
import { HlmTableImports } from '@/shared/spartan/table';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucidePause,
  lucidePlay,
  lucidePlus,
  lucideRepeat,
  lucideSearch,
  lucideSquarePen,
  lucideTrash,
} from '@ng-icons/lucide';
import { RECURRING_FREQUENCIES, RECURRING_STATUSES } from '@shared/enums';
import type { Recurring, TransactionTemplate } from '@shared/types';
import { RecurringService } from '../../shared/recurring.service';

/** Lista todas as regras de recorrência, independente de mês — gerenciamento (pausar/retomar/editar/apagar). */
@Component({
  selector: 'app-recurring-list',
  imports: [
    FrameHeader,
    FrameHeaderButton,
    FramePaper,
    RouterLink,
    NgIcon,
    HlmButton,
    HlmBadge,
    ...HlmEmptyImports,
    ...HlmTableImports,
    CurrencyPipe,
    DatePipe,
  ],
  providers: [
    provideIcons({
      lucidePause,
      lucidePlay,
      lucidePlus,
      lucideRepeat,
      lucideSearch,
      lucideSquarePen,
      lucideTrash,
    }),
  ],
  template: `
    <div>
      <app-frame-header>
        <ng-icon slot="icon" name="lucideRepeat" class="text-[length:--spacing(12)]" />
        <h1 slot="title">Recorrências</h1>
        <p slot="subtitle">Regras de receitas e despesas que se repetem automaticamente</p>
        <div slot="actions" class="flex gap-2">
          <button appFrameHeaderButton routerLink="/recurring/matches">
            Detectar Recorrências
            <ng-icon name="lucideSearch" class="text-[length:--spacing(3.5)]" />
          </button>
          <button appFrameHeaderButton routerLink="/recurring/new">
            Nova Recorrência
            <ng-icon name="lucidePlus" class="text-[length:--spacing(3.5)]" />
          </button>
        </div>
      </app-frame-header>
      <app-frame-paper>
        @if (isLoading()) {
          <p class="text-muted-foreground py-8 text-center">Carregando recorrências...</p>
        } @else if (hasError()) {
          <p class="text-destructive py-8 text-center">
            Não foi possível carregar as recorrências.
          </p>
        } @else if (!rules().length) {
          <hlm-empty>
            <hlm-empty-header>
              <h3 hlmEmptyTitle>Nenhuma recorrência cadastrada</h3>
              <p hlmEmptyDescription>Crie uma regra para receitas ou despesas que se repetem.</p>
            </hlm-empty-header>
            <hlm-empty-content>
              <button hlmBtn variant="default" routerLink="/recurring/new">
                Nova Recorrência
                <ng-icon name="lucidePlus" class="text-[length:--spacing(3.5)]" />
              </button>
            </hlm-empty-content>
          </hlm-empty>
        } @else {
          <table hlmTable>
            <thead hlmTHead>
              <tr hlmTr>
                <th hlmTh>Nome</th>
                <th hlmTh>Conta</th>
                <th hlmTh>Frequência</th>
                <th hlmTh>Próxima ocorrência</th>
                <th hlmTh class="text-right!">Valor</th>
                <th hlmTh class="text-center!">Status</th>
                <th hlmTh class="text-center!">Ações</th>
              </tr>
            </thead>
            <tbody hlmTBody>
              @for (rule of rules(); track rule.id) {
                <tr hlmTr>
                  <td hlmTd class="font-medium">{{ rule.name }}</td>
                  <td hlmTd>{{ accountName(rule) }}</td>
                  <td hlmTd>{{ frequencyLabel(rule) }}</td>
                  <td hlmTd class="tabular-nums">
                    {{ rule.nextDate ? (rule.nextDate | date: 'dd/MM/yyyy') : '—' }}
                  </td>
                  <td hlmTd class="text-right tabular-nums">
                    {{ templateOf(rule).amount | currency: accountCurrency(rule) }}
                  </td>
                  <td hlmTd class="text-center">
                    <span hlmBadge [variant]="statusVariant(rule)">{{ statusLabel(rule) }}</span>
                  </td>
                  <td hlmTd>
                    <div class="flex flex-row items-center justify-center gap-2">
                      @if (rule.status === 'active') {
                        <button
                          hlmBtn
                          variant="ghost"
                          size="icon-sm"
                          (click)="pause(rule)"
                          aria-label="Pausar recorrência"
                        >
                          <ng-icon name="lucidePause" class="text-[length:--spacing(3.5)]" />
                        </button>
                      } @else if (rule.status === 'paused') {
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
                        [routerLink]="['/recurring/edit', rule.id]"
                        aria-label="Editar recorrência"
                      >
                        <ng-icon name="lucideSquarePen" class="text-[length:--spacing(3.5)]" />
                      </button>
                      <button
                        hlmBtn
                        variant="ghost"
                        size="icon-sm"
                        (click)="remove(rule)"
                        aria-label="Apagar recorrência"
                      >
                        <ng-icon
                          name="lucideTrash"
                          class="text-[length:--spacing(3.5)] text-destructive"
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </app-frame-paper>
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RecurringList {
  protected readonly recurringService = inject(RecurringService);
  readonly #accountsService = inject(AccountsService);

  protected readonly rules = computed(() => this.recurringService.rules.value() ?? []);
  protected readonly isLoading = computed(() => this.recurringService.rules.isLoading());
  protected readonly hasError = computed(() => !!this.recurringService.rules.error());

  protected templateOf(rule: Recurring): TransactionTemplate {
    return rule.template as TransactionTemplate;
  }

  protected accountName(rule: Recurring): string {
    const accountId = this.templateOf(rule).accountId;
    return this.#accountsService.accounts.value()?.find((a) => a.id === accountId)?.name ?? '—';
  }

  protected accountCurrency(rule: Recurring): string {
    const accountId = this.templateOf(rule).accountId;
    return (
      this.#accountsService.accounts.value()?.find((a) => a.id === accountId)?.currency ?? 'BRL'
    );
  }

  protected frequencyLabel(rule: Recurring): string {
    const { frequency, interval } = rule.recurringPattern;
    const base = RECURRING_FREQUENCIES[frequency];
    return interval > 1 ? `${base} (a cada ${interval})` : base;
  }

  protected statusLabel(rule: Recurring): string {
    return RECURRING_STATUSES[rule.status];
  }

  protected statusVariant(rule: Recurring): 'default' | 'secondary' | 'outline' {
    if (rule.status === 'active') return 'default';
    if (rule.status === 'paused') return 'secondary';
    return 'outline';
  }

  protected async pause(rule: Recurring): Promise<void> {
    await this.recurringService.pause(rule.id);
    this.recurringService.rules.reload();
  }

  protected async resume(rule: Recurring): Promise<void> {
    await this.recurringService.resume(rule.id);
    this.recurringService.rules.reload();
  }

  protected async remove(rule: Recurring): Promise<void> {
    const confirmed = window.confirm(
      `Apagar a recorrência "${rule.name}"? As transações já geradas permanecem.`,
    );
    if (!confirmed) return;
    await this.recurringService.delete(rule.id);
    this.recurringService.rules.reload();
  }
}
