import {
  AccountsService,
  type AccountPurgeResult,
} from '@/features/accounts/shared/accounts.service';
import { LedgerInvalidationService } from '@/features/transactions/shared/ledger-invalidation.service';
import { HlmButton } from '@/shared/spartan/button';
import {
  HlmDialogDescription,
  HlmDialogFooter,
  HlmDialogHeader,
  HlmDialogTitle,
} from '@/shared/spartan/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import type { Account, AccountPurgeOptions } from '@shared/types';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';

/** Contexto esperado ao abrir via `HlmDialogService.open(AccountCleanupDialog, { context })`. */
export interface AccountCleanupContext {
  account: Account;
}

/**
 * Modal de limpeza/exclusão de conta: quatro ações independentes (checkbox),
 * exceto que "apagar conta" força as demais — uma transação não existe sem
 * conta e uma recorrência órfã travaria o materializador pra sempre.
 */
@Component({
  selector: 'app-account-cleanup-dialog',
  imports: [HlmButton, HlmDialogHeader, HlmDialogFooter, HlmDialogTitle, HlmDialogDescription],
  template: `
    <hlm-dialog-header>
      <h3 hlmDialogTitle>Limpar conta</h3>
      <p hlmDialogDescription>
        Escolha o que fazer com a conta <strong>{{ account.name }}</strong
        >. As ações marcadas são permanentes.
      </p>
    </hlm-dialog-header>

    <div class="flex flex-col gap-3 py-4">
      <label class="flex items-center gap-3">
        <input
          type="checkbox"
          id="deleteTransactions"
          class="accent-primary size-4"
          [checked]="deleteTransactions()"
          [disabled]="deleteAccount()"
          (change)="deleteTransactions.set($any($event.target).checked)"
        />
        <span>
          Apagar transações
          @if (preview.value(); as counts) {
            <span class="text-muted-foreground">({{ counts.transactionsCount }})</span>
          }
        </span>
      </label>
      <label class="flex items-center gap-3">
        <input
          type="checkbox"
          id="deleteRecurring"
          class="accent-primary size-4"
          [checked]="deleteRecurring()"
          [disabled]="deleteAccount()"
          (change)="deleteRecurring.set($any($event.target).checked)"
        />
        <span>
          Apagar recorrências
          @if (preview.value(); as counts) {
            <span class="text-muted-foreground">({{ counts.recurringCount }})</span>
          }
        </span>
      </label>
      <label class="flex items-center gap-3">
        <input
          type="checkbox"
          id="zeroBalance"
          class="accent-primary size-4"
          [checked]="zeroBalance()"
          [disabled]="deleteAccount()"
          (change)="zeroBalance.set($any($event.target).checked)"
        />
        <span>Zerar saldo</span>
      </label>
      <label class="flex items-center gap-3">
        <input
          type="checkbox"
          id="deleteAccount"
          class="accent-primary size-4"
          [checked]="deleteAccount()"
          (change)="toggleDeleteAccount($any($event.target).checked)"
        />
        <span class="text-destructive font-medium">Apagar conta</span>
      </label>
    </div>

    @if (anySelected()) {
      <p class="text-muted-foreground pb-4 text-xs">{{ warning() }}</p>
    }
    @if (error()) {
      <p class="text-destructive pb-4 text-xs">
        Não foi possível concluir a operação. Tente de novo.
      </p>
    }

    <hlm-dialog-footer>
      <button hlmBtn variant="outline" type="button" (click)="cancel()">Cancelar</button>
      <button
        hlmBtn
        variant="destructive"
        type="button"
        data-testid="confirm"
        [disabled]="!anySelected() || busy()"
        (click)="confirm()"
      >
        Confirmar
      </button>
    </hlm-dialog-footer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountCleanupDialog {
  readonly #accountsService = inject(AccountsService);
  readonly #invalidation = inject(LedgerInvalidationService);
  readonly #dialogRef = inject(BrnDialogRef<AccountPurgeResult>);

  protected readonly account = injectBrnDialogContext<AccountCleanupContext>().account;

  /** Contagens reais de impacto, carregadas ao abrir o modal. */
  protected readonly preview = resource({
    loader: () => this.#accountsService.purgePreview(this.account.id),
  });

  protected readonly deleteTransactions = signal(false);
  protected readonly deleteRecurring = signal(false);
  protected readonly zeroBalance = signal(false);
  protected readonly deleteAccount = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal(false);

  protected readonly anySelected = computed(
    () =>
      this.deleteTransactions() ||
      this.deleteRecurring() ||
      this.zeroBalance() ||
      this.deleteAccount(),
  );

  /** Aviso dinâmico conforme a combinação marcada. */
  protected readonly warning = computed(() => {
    if (this.deleteAccount()) {
      return 'A conta e tudo relacionado a ela (transações, recorrências e saldo) serão apagados permanentemente.';
    }
    const parts: string[] = [];
    if (this.deleteTransactions()) parts.push('as transações serão apagadas');
    if (this.deleteRecurring()) parts.push('as recorrências serão apagadas');
    if (this.zeroBalance()) parts.push('o saldo será zerado');
    return `Ao confirmar, ${parts.join(', ')}. A conta continua existindo.`;
  });

  /** "Apagar conta" arrasta as demais opções junto; desmarcar devolve tudo a false. */
  protected toggleDeleteAccount(checked: boolean): void {
    this.deleteAccount.set(checked);
    this.deleteTransactions.set(checked);
    this.deleteRecurring.set(checked);
    this.zeroBalance.set(checked);
  }

  protected cancel(): void {
    this.#dialogRef.close(undefined);
  }

  protected async confirm(): Promise<void> {
    if (!this.anySelected() || this.busy()) return;
    this.busy.set(true);
    this.error.set(false);
    const options: AccountPurgeOptions = {
      deleteTransactions: this.deleteTransactions(),
      deleteRecurring: this.deleteRecurring(),
      zeroBalance: this.zeroBalance(),
      deleteAccount: this.deleteAccount(),
    };
    try {
      const result = await this.#accountsService.purge(this.account.id, options);
      if (options.deleteTransactions || options.zeroBalance || options.deleteAccount) {
        this.#invalidation.reloadBalanceAffectingData();
      }
      if (options.deleteRecurring) this.#invalidation.reloadRules();
      this.#dialogRef.close(result);
    } catch {
      this.error.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
