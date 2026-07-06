import { FrameHeader } from '@/shared/frame/frame-header';
import { FramePaper } from '@/shared/frame/frame-paper';
import { HlmBadge } from '@/shared/spartan/badge';
import { ZardButtonComponent } from '@/shared/zard/components/button/button.component';
import { HlmEmptyImports } from '@/shared/spartan/empty';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLandmark, lucidePlus, lucideSquarePen, lucideTrash } from '@ng-icons/lucide';
import { ZardTableImports } from '@/shared/zard/components/table';
import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Account } from '@shared/types';
import { AccountsService } from '../../shared/accounts.service';

@Component({
  selector: 'app-accounts',
  imports: [
    FrameHeader,
    FramePaper,
    RouterLink,
    NgIcon,
    ZardButtonComponent,
    HlmBadge,
    ...HlmEmptyImports,
    CurrencyPipe,
    ...ZardTableImports,
  ],
  providers: [provideIcons({ lucideLandmark, lucidePlus, lucideSquarePen, lucideTrash })],
  template: `
    <div>
      <app-frame-header>
        <ng-icon slot="icon" name="lucideLandmark" class="text-[length:--spacing(12)]" />
        <h1 slot="title">Contas Bancárias</h1>
        <p slot="subtitle">Gerencie suas contas e configurações</p>
        <div slot="actions">
          <button z-button zType="outline" routerLink="/accounts/new">
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
              <button z-button zType="default" routerLink="/accounts/new">
                Adicionar Conta
                <ng-icon name="lucidePlus" class="text-[length:--spacing(3.5)]" />
              </button>
            </hlm-empty-content>
          </hlm-empty>
        } @else {
          <table z-table>
            <thead z-table-header>
              <tr z-table-row>
                <th z-table-head>Nome</th>
                <th z-table-head>Tipo</th>
                <th z-table-head>Provedor</th>
                <th z-table-head class="text-right">Saldo</th>
                <th z-table-head class="text-right">Ações</th>
              </tr>
            </thead>
            <tbody z-table-body>
              @for (account of accounts.value(); track account.id) {
                <tr z-table-row>
                  <td z-table-cell class="font-medium">{{ account.name }}</td>
                  <td z-table-cell>
                    <span hlmBadge variant="secondary">{{ typeLabel(account.type) }}</span>
                  </td>
                  <td z-table-cell>{{ providerLabel(account.accountProvider) }}</td>
                  <td z-table-cell class="text-left tabular-nums">
                    {{ account.balance | currency: account.currency }}
                  </td>
                  <td z-table-cell>
                    <div class="flex flex-row items-center gap-2 ">
                      <button
                        z-button
                        zType="ghost"
                        zSize="sm"
                        [routerLink]="['/accounts', account.id]"
                        aria-label="Editar conta"
                      >
                        <ng-icon name="lucideSquarePen" class="text-[length:--spacing(3.5)]" />
                      </button>
                      <button
                        z-button
                        zType="ghost"
                        zSize="sm"
                        (click)="remove(account)"
                        aria-label="Apagar conta"
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
export default class AccountsList {
  protected readonly accountsService = inject(AccountsService);
  protected readonly accounts = this.accountsService.accounts;

  /** Rótulo amigável do tipo de conta; cai no valor cru se os tipos ainda não carregaram. */
  protected typeLabel(value: string): string {
    return (
      this.accountsService.accountTypes.value()?.find((o) => o.value === value)?.label ?? value
    );
  }

  /** Rótulo do provedor; `—` quando ausente. */
  protected providerLabel(value: string | null | undefined): string {
    if (!value) return '—';
    return this.accountsService.providers.value()?.find((o) => o.value === value)?.label ?? value;
  }

  /** Apaga a conta após confirmação e recarrega a lista. */
  protected async remove(account: Account): Promise<void> {
    const confirmed = window.confirm(`Apagar a conta "${account.name}"? Esta ação é irreversível.`);
    if (!confirmed) return;
    await this.accountsService.delete(account.id);
    this.accounts.reload();
  }
}
