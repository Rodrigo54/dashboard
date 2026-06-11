import { FrameHeader } from '@/shared/ui/frame/frame-header';
import { FramePaper } from '@/shared/ui/frame/frame-paper';
import { ZardBadgeComponent } from '@/shared/ui/zard/components/badge/badge.component';
import { ZardButtonComponent } from '@/shared/ui/zard/components/button/button.component';
import { ZardEmptyComponent } from '@/shared/ui/zard/components/empty';
import { ZardIconComponent } from '@/shared/ui/zard/components/icon/icon.component';
import { ZardTableImports } from '@/shared/ui/zard/components/table';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Account } from '@shared/types';
import { AccountsService } from './accounts.service';

@Component({
  selector: 'app-accounts',
  imports: [
    FrameHeader,
    FramePaper,
    RouterLink,
    ZardIconComponent,
    ZardButtonComponent,
    ZardBadgeComponent,
    ZardEmptyComponent,
    ...ZardTableImports,
  ],
  template: `
    <div>
      <app-frame-header>
        <z-icon slot="icon" zSize="4xl" zType="landmark"></z-icon>
        <h1 slot="title">Contas Bancárias</h1>
        <p slot="subtitle">Gerencie suas contas e configurações</p>
        <div slot="actions">
          <button z-button zType="outline" routerLink="/accounts/new">
            Adicionar Conta
            <i z-icon zType="plus"></i>
          </button>
        </div>
      </app-frame-header>
      <app-frame-paper>
        @if (accounts.isLoading()) {
          <p class="text-muted-foreground py-8 text-center">Carregando contas...</p>
        } @else if (accounts.error()) {
          <p class="text-destructive py-8 text-center">Não foi possível carregar as contas.</p>
        } @else if (!accounts.value()?.length) {
          <z-empty
            zTitle="Nenhuma conta cadastrada"
            zDescription="Adicione sua primeira conta bancária para começar a organizar suas finanças."
            [zActions]="[addAction]"
          ></z-empty>
          <ng-template #addAction>
            <button z-button zType="default" routerLink="/accounts/new">
              Adicionar Conta
              <i z-icon zType="plus"></i>
            </button>
          </ng-template>
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
                    <z-badge zType="secondary">{{ typeLabel(account.type) }}</z-badge>
                  </td>
                  <td z-table-cell>{{ providerLabel(account.accountProvider) }}</td>
                  <td z-table-cell class="text-right tabular-nums">
                    {{ account.balance }} {{ account.currency }}
                  </td>
                  <td z-table-cell>
                    <div class="flex flex-row-reverse gap-2">
                      <button
                        z-button
                        zType="ghost"
                        zSize="sm"
                        [routerLink]="['/accounts', account.id]"
                        aria-label="Editar conta"
                      >
                        <i z-icon zType="square-pen"></i>
                      </button>
                      <button
                        z-button
                        zType="ghost"
                        zSize="sm"
                        (click)="remove(account)"
                        aria-label="Apagar conta"
                      >
                        <i z-icon zType="trash" class="text-destructive"></i>
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
export default class Accounts {
  protected readonly accountsService = inject(AccountsService);
  protected readonly accounts = this.accountsService.accounts;

  /** Rótulo amigável do tipo de conta; cai no valor cru se os tipos ainda não carregaram. */
  protected typeLabel(value: string): string {
    return this.accountsService.accountTypes.value()?.find((o) => o.value === value)?.label ?? value;
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
