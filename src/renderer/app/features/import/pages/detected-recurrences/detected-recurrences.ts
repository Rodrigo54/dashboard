import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { LedgerInvalidationService } from '@/features/transactions/shared/ledger-invalidation.service';
import { TransactionsService } from '@/features/transactions/shared/transactions.service';
import { FrameHeader } from '@/shared/frame/frame-header';
import { FrameHeaderButton } from '@/shared/frame/frame-header-button';
import { FramePaper } from '@/shared/frame/frame-paper';
import { HlmBadge } from '@/shared/spartan/badge';
import { HlmButton } from '@/shared/spartan/button';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideRepeat } from '@ng-icons/lucide';
import { HlmSpinner } from '@/shared/spartan/spinner';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RECURRING_FREQUENCIES } from '@shared/enums';
import type { DetectedRecurrence } from '@shared/types';
import { ImportService } from '../../shared/import.service';
import { toConfirmPayload } from '../../shared/detected-recurrence.utils';

@Component({
  selector: 'app-detected-recurrences',
  imports: [
    FrameHeader,
    FrameHeaderButton,
    FramePaper,
    RouterLink,
    NgIcon,
    HlmButton,
    HlmBadge,
    HlmSpinner,
    CurrencyPipe,
    DatePipe,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucideRepeat })],
  template: `
    <div>
      <app-frame-header>
        <ng-icon slot="icon" name="lucideRepeat" class="text-[length:--spacing(12)]" />
        <h1 slot="title">Recorrências Detectadas</h1>
        <p slot="subtitle">Padrões encontrados no seu histórico de transações</p>
        <div slot="actions">
          <button appFrameHeaderButton routerLink="/import">
            <ng-icon name="lucideArrowLeft" class="text-[length:--spacing(3.5)]" />
            Voltar
          </button>
        </div>
      </app-frame-header>

      <app-frame-paper>
        @if (loading()) {
          <div class="flex flex-col items-center gap-3 py-12">
            <hlm-spinner class="text-[length:--spacing(6)]" />
            <p class="text-muted-foreground">Analisando o histórico...</p>
          </div>
        } @else if (error()) {
          <p class="text-destructive py-8 text-center">{{ error() }}</p>
        } @else if (!suggestions().length) {
          <p class="text-muted-foreground py-12 text-center">
            Nenhum padrão de recorrência encontrado. Importe mais extratos para melhorar a detecção.
          </p>
        } @else {
          <div class="flex flex-col gap-3">
            @for (item of suggestions(); track item.key) {
              <div
                class="border-border flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
              >
                <div class="flex flex-col gap-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{{ item.description }}</span>
                    <span hlmBadge variant="outline">{{ frequencyLabel(item) }}</span>
                    <span hlmBadge variant="secondary">{{ item.occurrences }}x</span>
                  </div>
                  <p class="text-muted-foreground text-sm">
                    {{ accountName(item.accountId) }} · desde
                    {{ item.startDate | date: 'dd/MM/yyyy' }} · média
                    {{ item.averageAmount | currency: 'BRL' }} ({{
                      item.minAmount | currency: 'BRL'
                    }}
                    – {{ item.maxAmount | currency: 'BRL' }})
                  </p>
                </div>
                <div class="flex gap-2">
                  <button hlmBtn variant="ghost" size="sm" (click)="dismiss(item)">Ignorar</button>
                  <button
                    hlmBtn
                    variant="default"
                    size="sm"
                    [disabled]="pending().has(item.key)"
                    (click)="confirm(item)"
                  >
                    Criar recorrência
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </app-frame-paper>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DetectedRecurrences implements OnInit {
  protected readonly accountsService = inject(AccountsService);
  readonly #transactionsService = inject(TransactionsService);
  readonly #ledgerInvalidation = inject(LedgerInvalidationService);
  readonly #importService = inject(ImportService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly suggestions = signal<DetectedRecurrence[]>([]);
  protected readonly pending = signal<Set<string>>(new Set());

  async ngOnInit(): Promise<void> {
    try {
      this.suggestions.set(await this.#importService.detect());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Falha ao detectar recorrências.');
    } finally {
      this.loading.set(false);
    }
  }

  protected frequencyLabel(item: DetectedRecurrence): string {
    const base = RECURRING_FREQUENCIES[item.frequency];
    return item.interval > 1 ? `${base} (a cada ${item.interval})` : base;
  }

  protected accountName(accountId: string): string {
    return this.accountsService.accounts.value()?.find((a) => a.id === accountId)?.name ?? '—';
  }

  protected dismiss(item: DetectedRecurrence): void {
    this.suggestions.update((list) => list.filter((s) => s.key !== item.key));
  }

  protected async confirm(item: DetectedRecurrence): Promise<void> {
    this.pending.update((set) => new Set(set).add(item.key));
    try {
      await this.#importService.confirm(toConfirmPayload(item));
      this.dismiss(item);
      this.#ledgerInvalidation.reloadRules();
      // Só vincula transações já existentes a uma regra nova — saldo não muda.
      this.#transactionsService.transactions.reload();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Falha ao criar a recorrência.');
    } finally {
      this.pending.update((set) => {
        const next = new Set(set);
        next.delete(item.key);
        return next;
      });
    }
  }
}
