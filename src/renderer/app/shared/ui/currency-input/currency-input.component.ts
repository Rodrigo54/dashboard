import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  model,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { ZardInputDirective } from '@/shared/ui/zard/components/input/input.directive';
import type { ZardInputSizeVariants } from '@/shared/ui/zard/components/input/input.variants';
import { ZardInputGroupComponent } from '@/shared/ui/zard/components/input-group/input-group.component';

import {
  decimalStringToDigits,
  digitsToDecimalString,
  digitsToMasked,
  sanitizeDigits,
} from './currency.utils';

/**
 * Input de moeda estilo "app bancário" sobre o z-input-group.
 *
 * O campo sempre exibe `0,00` e preenche da direita para a esquerda conforme o
 * usuário digita (`1` -> `0,01`, `12` -> `0,12`, `123` -> `1,23`). O estado é
 * só a sequência de dígitos (centavos) extraída do texto, reformatada a cada
 * tecla, com o caret ancorado no fim.
 *
 * O `ZardInputDirective` é o único escritor do `el.value` (ele espelha o seu
 * `value` model no DOM via effect); este componente nunca escreve no DOM
 * diretamente — apenas seta o `value` da diretiva com o texto mascarado, o que
 * também corrige entradas inválidas que não alteram o modelo (ex.: letras).
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
  imports: [ZardInputGroupComponent, ZardInputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <z-input-group [zAddonBefore]="zCurrency()" [zSize]="zSize()" [zDisabled]="disabled()">
      <input
        #control
        z-input
        type="text"
        inputmode="numeric"
        autocomplete="off"
        [attr.aria-label]="zCurrency()"
        (input)="onInput()"
        (focus)="moveCaretToEnd()"
        (mouseup)="moveCaretToEnd()"
      />
    </z-input-group>
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
  /** Tamanho do input-group (`sm` | `default` | `lg`). */
  readonly zSize = input<ZardInputSizeVariants>('default');

  private readonly element = viewChild.required<ElementRef<HTMLInputElement>>('control');
  private readonly zInput = viewChild.required('control', { read: ZardInputDirective });

  constructor() {
    // Sincroniza modelo -> view (carga inicial, edição, resets) através do
    // `value` da diretiva — o effect dela espelha o texto no `el.value`.
    effect(() => {
      const decimals = this.zDecimals();
      const masked = digitsToMasked(decimalStringToDigits(this.value(), decimals), decimals);

      this.zInput().value.set(masked);
    });
  }

  /** Reextrai os dígitos do texto cru, reformata pela direita e atualiza o modelo. */
  protected onInput(): void {
    const decimals = this.zDecimals();
    const digits = sanitizeDigits(this.element().nativeElement.value);

    // Corrige o texto exibido mesmo quando o modelo não muda (ex.: letras digitadas).
    this.zInput().value.set(digitsToMasked(digits, decimals));
    this.value.set(digitsToDecimalString(digits, decimals));
  }

  /** Mantém o caret ancorado no fim — a digitação sempre preenche pela direita. */
  protected moveCaretToEnd(): void {
    const element = this.element().nativeElement;
    element.setSelectionRange(element.value.length, element.value.length);
  }
}
