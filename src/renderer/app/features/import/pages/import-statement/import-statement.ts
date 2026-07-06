import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { RecurringService } from '@/features/transactions/shared/recurring.service';
import { TransactionsService } from '@/features/transactions/shared/transactions.service';
import { FrameHeader } from '@/shared/frame/frame-header';
import { FramePaper } from '@/shared/frame/frame-paper';
import { ZardButtonComponent } from '@/shared/zard/components/button/button.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideCircleCheck, lucideFileText, lucideRepeat } from '@ng-icons/lucide';
import { HlmSpinner } from '@/shared/spartan/spinner';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ACCOUNT_PROVIDERS } from '@shared/enums';
import type { ImportCommitResult, ImportPreview } from '@shared/types';
import { ImportService } from '../../shared/import.service';
import { toCommitItem, toStagingRow, type StagingRow } from '../../shared/staging-row';
import { ImportStagingTable, type CellEdit } from './import-staging-table';

@Component({
  selector: 'app-import-statement',
  imports: [
    FrameHeader,
    FramePaper,
    RouterLink,
    NgIcon,
    ZardButtonComponent,
    HlmSpinner,
    ImportStagingTable,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucideCircleCheck, lucideFileText, lucideRepeat })],
  template: `
    <div>
      <app-frame-header>
        <ng-icon slot="icon" name="lucideFileText" class="text-[length:--spacing(12)]" />
        <h1 slot="title">Importar Extrato</h1>
        <p slot="subtitle">Extraia transações de um PDF de extrato (Banco do Brasil ou Itaú)</p>
        <div slot="actions">
          <button z-button zType="outline" routerLink="/transactions">
            <ng-icon name="lucideArrowLeft" class="text-[length:--spacing(3.5)]" />
            Voltar
          </button>
        </div>
      </app-frame-header>

      <app-frame-paper>
        @if (loading()) {
          <div class="flex flex-col items-center gap-3 py-12">
            <hlm-spinner class="text-[length:--spacing(6)]" />
            <p class="text-muted-foreground">Processando o extrato...</p>
          </div>
        } @else if (result(); as res) {
          <div class="flex flex-col items-center gap-4 py-12 text-center">
            <ng-icon name="lucideCircleCheck" class="text-emerald-600" style="font-size: 3rem" />
            <div>
              <p class="text-lg font-semibold">Importação concluída</p>
              <p class="text-muted-foreground">
                {{ res.inserted }} inserida(s), {{ res.reconciled }} reconciliada(s),
                {{ res.skipped }} ignorada(s).
              </p>
            </div>
            <div class="flex gap-3">
              <button z-button zType="outline" (click)="reset()">Importar outro</button>
              <button z-button zType="default" routerLink="/transactions">Ver transações</button>
            </div>
          </div>
        } @else if (preview(); as pv) {
          <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div class="flex flex-col gap-1">
              <p class="font-medium">{{ fileName() }}</p>
              <p class="text-muted-foreground text-sm">
                Banco detectado: <strong>{{ bankLabel(pv.bank) }}</strong> ·
                {{ includedCount() }} de {{ pv.rows.length }} selecionada(s)
              </p>
            </div>
            <label class="flex items-center gap-2 text-sm">
              <span class="text-muted-foreground">Conta</span>
              <select
                class="border-border bg-background w-48 rounded-md border px-2 py-1 text-sm"
                [value]="accountId()"
                (change)="onAccount($event)"
                [disabled]="accounts().length === 0"
                aria-label="Conta de destino da importação"
              >
                @for (account of accounts(); track account.id) {
                  <option [value]="account.id" [selected]="account.id === accountId()">
                    {{ account.name }}
                  </option>
                }
              </select>
            </label>
            <div class="flex gap-3">
              <button z-button zType="outline" (click)="reset()">Cancelar</button>
              <button
                z-button
                zType="default"
                [disabled]="includedCount() === 0 || !accountId()"
                (click)="confirm()"
              >
                Importar {{ includedCount() }} transação(ões)
              </button>
            </div>
          </div>

          @if (accounts().length === 0) {
            <div
              class="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-700"
            >
              Nenhuma conta cadastrada. Crie uma conta antes de importar.
            </div>
          }

          @if (reconciliationMessage(); as message) {
            <div
              class="mb-4 rounded-md border px-4 py-2 text-sm"
              [class]="pv.reconciliation.balanced ? balancedClass : unbalancedClass"
            >
              {{ message }}
            </div>
          }

          <app-import-staging-table
            [rows]="rows()"
            [categories]="transactionsService.categories.value()"
            (toggleInclude)="onToggle($event)"
            (changeCategory)="onCategory($event)"
          />
        } @else {
          <label
            class="border-border hover:bg-muted/40 flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed py-16 transition-colors"
          >
            <ng-icon
              name="lucideFileText"
              class="text-muted-foreground"
              style="font-size: 2.5rem"
            />
            <span class="font-medium">Selecione um PDF de extrato</span>
            <span class="text-muted-foreground text-sm">Banco do Brasil ou Itaú</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              class="hidden"
              (change)="onFile($event)"
            />
          </label>
          <div class="mt-6 flex justify-center">
            <button z-button zType="ghost" routerLink="/import/recurrences">
              <ng-icon name="lucideRepeat" class="text-[length:--spacing(3.5)]" />
              Detectar recorrências no histórico
            </button>
          </div>
          @if (error()) {
            <p class="text-destructive mt-4 text-center">{{ error() }}</p>
          }
        }
      </app-frame-paper>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ImportStatement {
  protected readonly accountsService = inject(AccountsService);
  protected readonly transactionsService = inject(TransactionsService);
  readonly #recurringService = inject(RecurringService);
  readonly #importService = inject(ImportService);

  protected readonly balancedClass = 'border-emerald-600/40 bg-emerald-600/10 text-emerald-700';
  protected readonly unbalancedClass = 'border-amber-500/40 bg-amber-500/10 text-amber-700';

  protected readonly fileName = signal('');
  protected readonly preview = signal<ImportPreview | null>(null);
  protected readonly rows = signal<StagingRow[]>([]);
  protected readonly accountId = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly result = signal<ImportCommitResult | null>(null);

  protected readonly accounts = computed(() => this.accountsService.accounts.value() ?? []);
  protected readonly includedCount = computed(() => this.rows().filter((r) => r.include).length);

  protected readonly reconciliationMessage = computed(() => {
    const rec = this.preview()?.reconciliation;
    if (!rec || rec.openingBalance === undefined || rec.closingBalance === undefined) return '';
    if (rec.balanced) return 'Conferência de saldo: os movimentos batem com o saldo do extrato.';
    return `Conferência de saldo: os movimentos somam ${rec.computedClosing}, mas o extrato informa ${rec.closingBalance}. Revise as linhas antes de importar.`;
  });

  protected bankLabel(bank: string): string {
    return (ACCOUNT_PROVIDERS as Record<string, string>)[bank] ?? 'Desconhecido';
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.error.set('');
    this.result.set(null);
    this.loading.set(true);
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const preview = await this.#importService.preview(file.name, data, this.accounts()[0]?.id);
      this.fileName.set(file.name);
      this.preview.set(preview);
      this.rows.set(preview.rows.map(toStagingRow));
      this.accountId.set(this.#defaultAccountId(preview.bank));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Falha ao processar o PDF.');
    } finally {
      this.loading.set(false);
    }
  }

  protected onToggle(index: number): void {
    this.rows.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, include: !row.include } : row)),
    );
  }

  protected onAccount(event: Event): void {
    this.accountId.set((event.target as HTMLSelectElement).value);
  }

  /** Primeira conta cujo provider bate com o banco detectado, senão a primeira. */
  #defaultAccountId(bank: string): string {
    const accounts = this.accounts();
    const match = accounts.find((account) => account.accountProvider === bank);
    return match?.id ?? accounts[0]?.id ?? '';
  }

  protected onCategory(edit: CellEdit): void {
    this.rows.update((rows) =>
      rows.map((row, i) => (i === edit.index ? { ...row, category: edit.value } : row)),
    );
  }

  protected async confirm(): Promise<void> {
    const accountId = this.accountId();
    if (!accountId) return;

    const items = this.rows()
      .filter((row) => row.include)
      .map((row) => toCommitItem(row, accountId));
    if (items.length === 0) return;

    this.loading.set(true);
    try {
      const result = await this.#importService.commit(items);
      this.result.set(result);
      this.preview.set(null);
      this.rows.set([]);
      this.accountId.set('');
      this.transactionsService.transactions.reload();
      this.accountsService.accounts.reload();
      this.#recurringService.rules.reload();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Falha ao importar.');
    } finally {
      this.loading.set(false);
    }
  }

  protected reset(): void {
    this.fileName.set('');
    this.preview.set(null);
    this.rows.set([]);
    this.accountId.set('');
    this.error.set('');
    this.result.set(null);
  }
}
