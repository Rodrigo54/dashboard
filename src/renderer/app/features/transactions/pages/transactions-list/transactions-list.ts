import { FrameHeader } from '@/shared/frame/frame-header';
import { FrameHeaderButton } from '@/shared/frame/frame-header-button';
import { FramePaper } from '@/shared/frame/frame-paper';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRightLeft, lucideFileText, lucidePlus } from '@ng-icons/lucide';
import { RouterLink } from '@angular/router';
import { TransactionsTable } from './transactions-table';

@Component({
  selector: 'app-transactions',
  imports: [FrameHeader, FrameHeaderButton, FramePaper, RouterLink, NgIcon, TransactionsTable],
  providers: [provideIcons({ lucideArrowRightLeft, lucideFileText, lucidePlus })],
  template: `
    <div>
      <app-frame-header>
        <ng-icon slot="icon" name="lucideArrowRightLeft" class="text-[length:--spacing(12)]" />
        <h1 slot="title">Transações</h1>
        <p slot="subtitle">Registre receitas e despesas, recorrentes ou avulsas</p>
        <div slot="actions" class="flex gap-2">
          <button appFrameHeaderButton routerLink="/import">
            Importar Extrato
            <ng-icon name="lucideFileText" class="text-[length:--spacing(3.5)]" />
          </button>
          <button appFrameHeaderButton routerLink="/transactions/new">
            Nova Transação
            <ng-icon name="lucidePlus" class="text-[length:--spacing(3.5)]" />
          </button>
        </div>
      </app-frame-header>
      <app-frame-paper>
        <app-transactions-table />
      </app-frame-paper>
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TransactionsList {}
