import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  linkedSignal,
  model,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  HlmInputGroup,
  HlmInputGroupAddon,
  HlmInputGroupInput,
} from '@/shared/spartan/input-group';

import {
  decimalStringToDigits,
  digitsToDecimalString,
  digitsToMasked,
  isNegativeDecimal,
  sanitizeDigits,
} from './currency.utils';

/**
 * Input de moeda estilo "app bancário" sobre o hlm-input-group do spartan.
 *
 * O campo sempre exibe `0,00` e preenche da direita para a esquerda conforme o
 * usuário digita (`1` -> `0,01`, `12` -> `0,12`, `123` -> `1,23`). O estado é
 * só a sequência de dígitos (centavos) extraída do texto, reformatada a cada
 * tecla, com o caret ancorado no fim.
 *
 * Este componente é o único escritor do `el.value`: o effect espelha o modelo
 * formatado no DOM, e `onInput` reescreve o texto mascarado mesmo quando o
 * modelo não muda (ex.: letras digitadas são descartadas).
 *
 * Implementa o contrato `FormValueControl<string>` das Signal Forms (Angular 22),
 * então integra diretamente com a diretiva `[formField]`:
 *
 * ```html
 * <app-currency-input [formField]="form.amount" />
 * ```
 *
 * O modelo é uma string decimal canônica (ponto decimal, sem milhar — ex.:
 * `"1234.56"`), compatível com schemas Zod `z.string()` (ex.: `balance`).
 */
@Component({
  selector: 'app-currency-input',
  imports: [HlmInputGroup, HlmInputGroupAddon, HlmInputGroupInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div hlmInputGroup>
      <div hlmInputGroupAddon>{{ zCurrency() }}</div>
      <input
        #control
        hlmInputGroupInput
        type="text"
        inputmode="numeric"
        autocomplete="off"
        [disabled]="disabled()"
        [attr.aria-label]="zCurrency()"
        (keydown)="onKeyDown($event)"
        (input)="onInput()"
        (focus)="moveCaretToEnd()"
        (mouseup)="moveCaretToEnd()"
      />
    </div>
  `,
})
export class CurrencyInputComponent implements FormValueControl<string> {
  /** String decimal canônica do controle (ex.: `"1234.56"`). Sincronizada pelo `[formField]`. */
  readonly value = model<string>('');
  /** Status de desabilitado. Vinculado automaticamente pelo `[formField]`. */
  readonly disabled = input<boolean>(false);

  /** Símbolo exibido como addon antes do input. */
  readonly zCurrency = input<string>('R$');
  /** Quantidade de casas decimais da formatação. */
  readonly zDecimals = input<number>(2);

  private readonly element = viewChild.required<ElementRef<HTMLInputElement>>('control');

  /** Rastreia o sinal do valor; reseta automaticamente quando `value` muda externamente. */
  private readonly _negative = linkedSignal(() => isNegativeDecimal(this.value()));

  constructor() {
    // Sincroniza modelo -> view (carga inicial, edição, resets) escrevendo o
    // texto mascarado direto no `el.value`.
    effect(() => {
      const decimals = this.zDecimals();
      const negative = this._negative();
      const masked = digitsToMasked(
        decimalStringToDigits(this.value(), decimals),
        decimals,
        negative,
      );

      this.element().nativeElement.value = masked;
    });
  }

  /** Reextrai os dígitos do texto cru, reformata pela direita e atualiza o modelo. */
  protected onInput(): void {
    const decimals = this.zDecimals();
    const negative = this._negative();
    const digits = sanitizeDigits(this.element().nativeElement.value);

    // Corrige o texto exibido mesmo quando o modelo não muda (ex.: letras digitadas).
    this.element().nativeElement.value = digitsToMasked(digits, decimals, negative);
    this.value.set(digitsToDecimalString(digits, decimals, negative));
  }

  /** Alterna o sinal ao pressionar `-`; ignora para outros atalhos. */
  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key !== '-') return;

    event.preventDefault();
    const decimals = this.zDecimals();
    const digits = sanitizeDigits(this.element().nativeElement.value);

    this._negative.update((n) => !n);
    const negative = this._negative();

    this.element().nativeElement.value = digitsToMasked(digits, decimals, negative);
    this.value.set(digitsToDecimalString(digits, decimals, negative));
  }

  /** Mantém o caret ancorado no fim — a digitação sempre preenche pela direita. */
  protected moveCaretToEnd(): void {
    const element = this.element().nativeElement;
    element.setSelectionRange(element.value.length, element.value.length);
  }
}
