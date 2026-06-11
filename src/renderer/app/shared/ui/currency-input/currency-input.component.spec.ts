import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CurrencyInputComponent } from './currency-input.component';

@Component({
  imports: [CurrencyInputComponent, FormField],
  template: `<app-currency-input [formField]="payForm.balance" />`,
})
class HostComponent {
  readonly model = signal({ balance: '' });
  readonly payForm = form(this.model);
}

describe('CurrencyInputComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<HostComponent>>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input');
  }

  it('renderiza o addon de moeda e o input', () => {
    const host: HTMLElement = fixture.nativeElement;
    expect(host.textContent).toContain('R$');
    expect(input()).toBeTruthy();
  });

  it('reflete a string decimal do modelo formatada na view', () => {
    fixture.componentInstance.model.set({ balance: '1234.5' });
    fixture.detectChanges();
    expect(input().value).toBe('1.234,50');
  });

  it('atualiza o modelo com a string decimal canônica ao digitar', () => {
    const el = input();
    el.value = '1.234,56';
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.model().balance).toBe('1234.56');
  });

  it('mantém o modelo correto após digitar e perder o foco', () => {
    const el = input();
    el.dispatchEvent(new Event('focus'));
    el.value = '10,5';
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    // O ngx-mask é dono do texto exibido durante a edição; o contrato do
    // controle é a string decimal do modelo permanecer correta.
    expect(fixture.componentInstance.model().balance).toBe('10.5');
  });

  it('não compete com o ngx-mask enquanto o campo está em foco', () => {
    const el = input();
    el.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    // Com o campo em foco, uma mudança externa de modelo não sobrescreve o texto.
    el.value = '7,';
    fixture.componentInstance.model.set({ balance: '999' });
    fixture.detectChanges();
    expect(el.value).toBe('7,');
  });
});
