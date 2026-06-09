import { FrameHeader } from '@/shared/ui/frame/frame-header';
import { FramePaper } from '@/shared/ui/frame/frame-paper';
import { ZardButtonComponent } from '@/shared/ui/zard/components/button/button.component';
import { ZardIconComponent } from '@/shared/ui/zard/components/icon/icon.component';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-accounts',
  imports: [FrameHeader, ZardIconComponent, ZardButtonComponent, FramePaper, RouterLink],
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
        <div class="h-800">
          Conteúdo das Contas Bancárias Lorem ipsum dolor sit amet consectetur, adipisicing elit.
          Tempora odio cupiditate sit aspernatur id odit adipisci eos, veritatis, quos earum
          obcaecati fugit animi! Expedita, recusandae sunt. Blanditiis voluptas sint est?
        </div>
      </app-frame-paper>
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Accounts {}
