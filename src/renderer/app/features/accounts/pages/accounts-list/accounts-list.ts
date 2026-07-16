import { FrameHeader } from '@/shared/frame/frame-header';
import { FrameHeaderButton } from '@/shared/frame/frame-header-button';
import { FramePaper } from '@/shared/frame/frame-paper';
import { HlmBadge } from '@/shared/spartan/badge';
import { HlmButton } from '@/shared/spartan/button';
import { HlmEmptyImports } from '@/shared/spartan/empty';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBrushCleaning, lucideLandmark, lucidePlus, lucideSquarePen } from '@ng-icons/lucide';
import { HlmTableImports } from '@/shared/spartan/table';
import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Account } from '@shared/types';
import { HlmDialogService } from '@/shared/spartan/dialog';
import { AccountsService } from '../../shared/accounts.service';
import { groupAccountsByProvider } from '../../shared/group-accounts-by-provider';
import { AccountCleanupDialog, type AccountCleanupContext } from './account-cleanup-dialog';

@Component({
  selector: 'app-accounts',
  imports: [
    FrameHeader,
    FrameHeaderButton,
    FramePaper,
    RouterLink,
    NgIcon,
    HlmButton,
    HlmBadge,
    ...HlmEmptyImports,
    CurrencyPipe,
    ...HlmTableImports,
  ],
  providers: [provideIcons({ lucideLandmark, lucidePlus, lucideSquarePen, lucideBrushCleaning })],
  template: `
    <div>
      <app-frame-header>
        <ng-icon slot="icon" name="lucideLandmark" class="text-[length:--spacing(12)]" />
        <h1 slot="title">Contas Bancárias</h1>
        <p slot="subtitle">Gerencie suas contas e configurações</p>
        <div slot="actions">
          <button appFrameHeaderButton routerLink="/accounts/new">
            Adicionar Conta
            <ng-icon name="lucidePlus" class="text-[length:--spacing(3.5)]" />
          </button>
        </div>
      </app-frame-header>
      <app-frame-paper>
        @if (accounts.isLoading()) {
          <p class="text-muted-foreground py-8 text-center">Carregando contas...</p>
        } @else if (accounts.error()) {
          <p class="text-destructive py-8 text-center">Não foi possível carregar as contas.</p>
        } @else if (!accounts.value()?.length) {
          <hlm-empty>
            <hlm-empty-header>
              <h3 hlmEmptyTitle>Nenhuma conta cadastrada</h3>
              <p hlmEmptyDescription>
                Adicione sua primeira conta bancária para começar a organizar suas finanças.
              </p>
            </hlm-empty-header>
            <hlm-empty-content>
              <button hlmBtn variant="default" routerLink="/accounts/new">
                Adicionar Conta
                <ng-icon name="lucidePlus" class="text-[length:--spacing(3.5)]" />
              </button>
            </hlm-empty-content>
          </hlm-empty>
        } @else {
          <table hlmTable>
            <tbody hlmTBody>
              @for (group of groups(); track group.label) {
                <tr hlmTr class="bg-muted/40 hover:bg-muted/40">
                  <td hlmTd colspan="4" class="font-semibold">
                    <div class="flex items-center justify-between">
                      <span>{{ group.label }}</span>
                      <span class="tabular-nums">
                        @for (
                          subtotal of group.subtotals;
                          track subtotal.currency;
                          let last = $last
                        ) {
                          {{ subtotal.amount | currency: subtotal.currency }}{{ last ? '' : ' + ' }}
                        }
                      </span>
                    </div>
                  </td>
                </tr>
                @for (account of group.accounts; track account.id) {
                  <tr hlmTr>
                    <td hlmTd class="pl-6 font-medium">{{ account.name }}</td>
                    <td hlmTd>
                      <span hlmBadge variant="secondary">{{ typeLabel(account.type) }}</span>
                    </td>
                    <td hlmTd class="text-left tabular-nums">
                      {{ account.balance | currency: account.currency }}
                    </td>
                    <td hlmTd>
                      <div class="flex flex-row items-center gap-2 ">
                        <button
                          hlmBtn
                          variant="ghost"
                          size="icon-sm"
                          [routerLink]="['/accounts/edit', account.id]"
                          aria-label="Editar conta"
                        >
                          <ng-icon name="lucideSquarePen" class="text-[length:--spacing(3.5)]" />
                        </button>
                        <button
                          hlmBtn
                          variant="ghost"
                          size="icon-sm"
                          (click)="openCleanup(account)"
                          aria-label="Limpar conta"
                        >
                          <ng-icon
                            name="lucideBrushCleaning"
                            class="text-[length:--spacing(3.5)] text-destructive"
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                }
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
export default class AccountsList {
  protected readonly accountsService = inject(AccountsService);
  protected readonly accounts = this.accountsService.accounts;
  readonly #dialog = inject(HlmDialogService);

  /** Contas agrupadas por provider, ordenadas e com subtotal — ver group-accounts-by-provider.ts. */
  protected readonly groups = computed(() =>
    groupAccountsByProvider(
      this.accounts.value() ?? [],
      this.accountsService.providers.value() ?? [],
    ),
  );

  /** Rótulo amigável do tipo de conta; cai no valor cru se os tipos ainda não carregaram. */
  protected typeLabel(value: string): string {
    return (
      this.accountsService.accountTypes.value()?.find((o) => o.value === value)?.label ?? value
    );
  }

  /**
   * Abre o modal de limpeza/exclusão. Os reloads pós-operação são disparados
   * pelo próprio modal (LedgerInvalidationService), conforme o que foi marcado.
   */
  protected openCleanup(account: Account): void {
    this.#dialog.open(AccountCleanupDialog, {
      context: { account } satisfies AccountCleanupContext,
    });
  }
}
