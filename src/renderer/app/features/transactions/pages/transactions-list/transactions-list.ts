import { FrameHeader } from '@/shared/frame/frame-header';
import { FramePaper } from '@/shared/frame/frame-paper';
import { ZardButtonComponent } from '@/shared/zard/components/button/button.component';
import { ZardIconComponent } from '@/shared/zard/components/icon/icon.component';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TransactionsTable } from './transactions-table';

@Component({
  selector: 'app-transactions',
  imports: [
    FrameHeader,
    FramePaper,
    RouterLink,
    ZardIconComponent,
    ZardButtonComponent,
    TransactionsTable,
  ],
  template: `
    <div>
      <app-frame-header>
        <z-icon slot="icon" zSize="4xl" zType="arrow-right-left"></z-icon>
        <h1 slot="title">Transações</h1>
        <p slot="subtitle">Registre receitas e despesas, recorrentes ou avulsas</p>
        <div slot="actions">
          <button z-button zType="outline" routerLink="/transactions/new">
            Nova Transação
            <i z-icon zType="plus"></i>
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
