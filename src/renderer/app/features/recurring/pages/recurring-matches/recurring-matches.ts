import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { LedgerInvalidationService } from '@/features/transactions/shared/ledger-invalidation.service';
import { FrameHeader } from '@/shared/frame/frame-header';
import { FrameHeaderButton } from '@/shared/frame/frame-header-button';
import { FramePaper } from '@/shared/frame/frame-paper';
import { HlmBadge } from '@/shared/spartan/badge';
import { HlmButton } from '@/shared/spartan/button';
import { HlmEmptyImports } from '@/shared/spartan/empty';
import { HlmTableImports } from '@/shared/spartan/table';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideCheck,
  lucideChevronLeft,
  lucideChevronRight,
  lucideRepeat,
  lucideX,
} from '@ng-icons/lucide';
import type { RecurrenceMatchCandidate } from '@shared/types';
import { RecurringService } from '../../shared/recurring.service';

/** Tela geral de detecção: candidatos de vínculo entre transações sem regra e recorrências existentes. */
@Component({
  selector: 'app-recurring-matches',
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
      lucideArrowLeft,
      lucideCheck,
      lucideChevronLeft,
      lucideChevronRight,
      lucideRepeat,
      lucideX,
    }),
  ],
  template: `
    <div>
      <app-frame-header>
        <ng-icon slot="icon" name="lucideRepeat" class="text-[length:--spacing(12)]" />
        <h1 slot="title">Detectar Recorrências</h1>
        <p slot="subtitle">
          Transações sem regra que provavelmente pertencem a uma recorrência já cadastrada
        </p>
        <div slot="actions">
          <button appFrameHeaderButton routerLink="/recurring">
            <ng-icon name="lucideArrowLeft" class="text-[length:--spacing(3.5)]" />
            Voltar
          </button>
        </div>
      </app-frame-header>
      <app-frame-paper>
        <div class="mb-6 flex items-center gap-1">
          <button
            hlmBtn
            variant="ghost"
            size="sm"
            [disabled]="recurringService.isCurrentMonth()"
            (click)="recurringService.goToToday()"
            aria-label="Voltar para o mês atual"
          >
            <ng-icon name="lucideArrowLeft" class="text-[length:--spacing(3.5)]" />
            Hoje
          </button>
          <button
            hlmBtn
            variant="ghost"
            size="icon-sm"
            (click)="recurringService.previousMonth()"
            aria-label="Mês anterior"
          >
            <ng-icon name="lucideChevronLeft" class="text-[length:--spacing(3.5)]" />
          </button>
          <button
            hlmBtn
            variant="ghost"
            size="icon-sm"
            (click)="recurringService.nextMonth()"
            aria-label="Próximo mês"
          >
            <ng-icon name="lucideChevronRight" class="text-[length:--spacing(3.5)]" />
          </button>
          <span class="ml-2 text-base font-semibold capitalize">{{
            recurringService.monthLabel()
          }}</span>
        </div>

        @if (isLoading()) {
          <p class="text-muted-foreground py-8 text-center">Buscando candidatos...</p>
        } @else if (hasError()) {
          <p class="text-destructive py-8 text-center">Não foi possível carregar os candidatos.</p>
        } @else if (!candidates().length) {
          <hlm-empty>
            <hlm-empty-header>
              <h3 hlmEmptyTitle>Nenhum candidato neste mês</h3>
              <p hlmEmptyDescription>
                Toda transação sem recorrência do mês já está vinculada, ou nenhuma bate com uma
                regra cadastrada.
              </p>
            </hlm-empty-header>
          </hlm-empty>
        } @else {
          <table hlmTable>
            <thead hlmTHead>
              <tr hlmTr>
                <th hlmTh>Data</th>
                <th hlmTh>Descrição</th>
                <th hlmTh>Conta</th>
                <th hlmTh class="text-right!">Valor</th>
                <th hlmTh>Recorrência sugerida</th>
                <th hlmTh class="text-center!">Confiança</th>
                <th hlmTh class="text-center!">Ações</th>
              </tr>
            </thead>
            <tbody hlmTBody>
              @for (candidate of candidates(); track candidate.transactionId) {
                <tr hlmTr>
                  <td hlmTd class="tabular-nums">
                    {{ candidate.transactionDate | date: 'dd/MM/yyyy' }}
                  </td>
                  <td hlmTd class="font-medium">{{ candidate.transactionDescription }}</td>
                  <td hlmTd>{{ accountName(candidate.transactionAccountId) }}</td>
                  <td hlmTd class="text-right tabular-nums">
                    {{
                      candidate.transactionAmount
                        | currency: accountCurrency(candidate.transactionAccountId)
                    }}
                  </td>
                  <td hlmTd>{{ candidate.recurringName }}</td>
                  <td hlmTd class="text-center">
                    <span hlmBadge [variant]="badgeVariant(candidate)">
                      {{ scorePercent(candidate) }}%
                    </span>
                  </td>
                  <td hlmTd>
                    <div class="flex flex-row items-center justify-center gap-2">
                      <button
                        hlmBtn
                        variant="ghost"
                        size="icon-sm"
                        [disabled]="pending().has(candidate.transactionId)"
                        (click)="confirm(candidate)"
                        aria-label="Confirmar vínculo"
                      >
                        <ng-icon name="lucideCheck" class="text-[length:--spacing(3.5)]" />
                      </button>
                      <button
                        hlmBtn
                        variant="ghost"
                        size="icon-sm"
                        [disabled]="pending().has(candidate.transactionId)"
                        (click)="reject(candidate)"
                        aria-label="Rejeitar sugestão"
                      >
                        <ng-icon
                          name="lucideX"
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
export default class RecurringMatches {
  protected readonly recurringService = inject(RecurringService);
  protected readonly accountsService = inject(AccountsService);
  readonly #ledgerInvalidation = inject(LedgerInvalidationService);

  /** Rejeitados nesta visita à tela — só visual, nunca persiste (reseta ao trocar de mês/recarregar). */
  protected readonly rejected = signal<ReadonlySet<string>>(new Set());
  protected readonly pending = signal<ReadonlySet<string>>(new Set());

  protected readonly candidates = computed(() =>
    (this.recurringService.matchCandidates.value() ?? []).filter(
      (candidate) => !this.rejected().has(candidate.transactionId),
    ),
  );

  protected readonly isLoading = computed(() => this.recurringService.matchCandidates.isLoading());
  protected readonly hasError = computed(() => !!this.recurringService.matchCandidates.error());

  protected accountName(accountId: string): string {
    return this.accountsService.accounts.value()?.find((a) => a.id === accountId)?.name ?? '—';
  }

  protected accountCurrency(accountId: string): string {
    return (
      this.accountsService.accounts.value()?.find((a) => a.id === accountId)?.currency ?? 'BRL'
    );
  }

  protected scorePercent(candidate: RecurrenceMatchCandidate): number {
    return Math.round(candidate.score * 100);
  }

  protected badgeVariant(candidate: RecurrenceMatchCandidate): 'default' | 'secondary' | 'outline' {
    if (candidate.score >= 0.85) return 'default';
    if (candidate.score >= 0.6) return 'secondary';
    return 'outline';
  }

  protected reject(candidate: RecurrenceMatchCandidate): void {
    this.rejected.update((set) => new Set(set).add(candidate.transactionId));
  }

  protected async confirm(candidate: RecurrenceMatchCandidate): Promise<void> {
    this.pending.update((set) => new Set(set).add(candidate.transactionId));
    try {
      await this.recurringService.linkTransaction(candidate.transactionId, candidate.recurringId);
      this.recurringService.matchCandidates.reload();
      this.#ledgerInvalidation.reloadRules();
      this.#ledgerInvalidation.reloadBalanceAffectingData();
    } finally {
      this.pending.update((set) => {
        const next = new Set(set);
        next.delete(candidate.transactionId);
        return next;
      });
    }
  }
}
