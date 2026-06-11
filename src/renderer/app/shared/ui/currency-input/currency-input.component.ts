import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  model,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

import { ZardInputDirective } from '@/shared/ui/zard/components/input/input.directive';
import type { ZardInputSizeVariants } from '@/shared/ui/zard/components/input/input.variants';
import { ZardInputGroupComponent } from '@/shared/ui/zard/components/input-group/input-group.component';

import { decimalStringToMasked, maskedToDecimalString } from './currency.utils';

/**
 * Input de moeda baseado em ngx-mask + z-input-group.
 *
 * Implementa o contrato `FormValueControl<number>` das Signal Forms (Angular 22),
 * então integra diretamente com a diretiva `[formField]`:
 *
 * ```html
 * <app-currency-input [formField]="form.amount" />
 * ```
 *
 * O modelo é uma string decimal canônica (ponto decimal, sem milhar — ex.:
 * `"1234.56"`), compatível com schemas Zod `z.string()` (ex.: `balance`). O
 * ngx-mask cuida apenas da formatação visual ao digitar; a sincronização
 * modelo -> view é feita com guarda de foco para não competir com o caret/máscara
 * durante a digitação.
 */
@Component({
  selector: 'app-currency-input',
  imports: [ZardInputGroupComponent, ZardInputDirective, NgxMaskDirective],
  providers: [provideNgxMask()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <z-input-group [zAddonBefore]="zCurrency()" [zSize]="zSize()" [zDisabled]="disabled()">
      <input
        #control
        z-input
        type="text"
        inputmode="decimal"
        [mask]="mask()"
        thousandSeparator="."
        decimalMarker=","
        [allowNegativeNumbers]="zAllowNegative()"
        [placeholder]="zPlaceholder()"
        [attr.aria-label]="zCurrency()"
        (focus)="focused.set(true)"
        (input)="onInput(control.value)"
        (blur)="focused.set(false)"
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
  /** Placeholder do input. */
  readonly zPlaceholder = input<string>('0,00');
  /** Permite valores negativos. */
  readonly zAllowNegative = input<boolean>(false);
  /** Quantidade de casas decimais da máscara/formatação. */
  readonly zDecimals = input<number>(2);
  /** Tamanho do input-group (`sm` | `default` | `lg`). */
  readonly zSize = input<ZardInputSizeVariants>('default');

  protected readonly mask = computed(() => `separator.${this.zDecimals()}`);
  protected readonly focused = signal(false);

  private readonly control = viewChild.required<ElementRef<HTMLInputElement>>('control');

  constructor() {
    // Sincroniza modelo -> view apenas quando o campo não está em foco,
    // deixando o ngx-mask no controle do caret durante a digitação. Como o
    // effect roda no change detection (depois dos handlers síncronos do
    // ngx-mask), ele também normaliza o texto exibido ao sair do campo.
    effect(() => {
      const formatted = decimalStringToMasked(this.value(), this.zDecimals());
      const element = this.control().nativeElement;

      if (!this.focused() && element.value !== formatted) {
        element.value = formatted;
      }
    });
  }

  protected onInput(raw: string): void {
    this.value.set(maskedToDecimalString(raw));
  }
}
