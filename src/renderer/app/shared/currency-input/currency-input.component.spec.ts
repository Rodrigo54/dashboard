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

  /** Simula a digitação de um caractere no fim do campo (estilo app bancário). */
  function type(char: string): void {
    const el = input();
    el.value = `${el.value}${char}`;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('renderiza o addon de moeda e inicia exibindo 0,00', () => {
    const host: HTMLElement = fixture.nativeElement;
    expect(host.textContent).toContain('R$');
    expect(input().value).toBe('0,00');
  });

  it('preenche da direita para a esquerda conforme o usuário digita', () => {
    type('1');
    expect(input().value).toBe('0,01');

    type('2');
    expect(input().value).toBe('0,12');

    type('3');
    expect(input().value).toBe('1,23');

    expect(fixture.componentInstance.model().balance).toBe('1.23');
  });

  it('aplica separador de milhar conforme o valor cresce', () => {
    for (const digit of '123456') {
      type(digit);
    }

    expect(input().value).toBe('1.234,56');
    expect(fixture.componentInstance.model().balance).toBe('1234.56');
  });

  it('remove o último dígito no backspace (direita para esquerda)', () => {
    for (const digit of '123') {
      type(digit);
    }

    const el = input();
    el.value = el.value.slice(0, -1); // backspace no fim: "1,23" -> "1,2"
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(el.value).toBe('0,12');
    expect(fixture.componentInstance.model().balance).toBe('0.12');
  });

  it('volta a 0,00 quando todos os dígitos são removidos', () => {
    type('5');

    const el = input();
    el.value = '';
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(el.value).toBe('0,00');
    expect(fixture.componentInstance.model().balance).toBe('0.00');
  });

  it('ignora caracteres não numéricos colados no campo', () => {
    const el = input();
    el.value = 'abc';
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(el.value).toBe('0,00');
  });

  it('reflete a string decimal do modelo formatada na view', () => {
    fixture.componentInstance.model.set({ balance: '1234.5' });
    fixture.detectChanges();

    expect(input().value).toBe('1.234,50');
  });
});
