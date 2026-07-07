import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import type { EnumOption } from '@shared/enums';
import type { ClassValue } from 'clsx';
import { HlmSelectImports } from '@/shared/spartan/select';
import { hlm } from '@/shared/spartan/utils';

/**
 * Wrapper de select data-driven sobre os primitivos do spartan: recebe uma
 * lista `items` de `{ value, label }` e monta trigger, portal e content sem
 * repetir esse bloco em cada form.
 *
 * Implementa o contrato `FormValueControl<string>` das Signal Forms, então
 * integra direto com `[formField]`; fora de um form, funciona com
 * `[(value)]` ou `[value]` + `(valueChange)`. `''` é o sentinela de "nada
 * selecionado" — mesma convenção já usada pelos campos obrigatórios dos forms.
 *
 * ```html
 * <app-select [formField]="form.type" [items]="accountTypes()" placeholder="Escolha o tipo" />
 * ```
 */
@Component({
  selector: 'app-select',
  imports: [...HlmSelectImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '_computedHostClass()',
  },
  template: `
    <hlm-select
      [value]="_innerValue()"
      (valueChange)="value.set($event ?? '')"
      [disabled]="disabled()"
      [itemToString]="itemToString"
    >
      <hlm-select-trigger class="w-full" [buttonId]="id()" [attr.aria-label]="ariaLabel()">
        <hlm-select-value [placeholder]="placeholder()" />
      </hlm-select-trigger>
      <ng-template hlmSelectPortal>
        <hlm-select-content>
          @for (item of items(); track item.value) {
            <hlm-select-item [value]="item.value">{{ item.label }}</hlm-select-item>
          }
        </hlm-select-content>
      </ng-template>
    </hlm-select>
  `,
})
export class SelectComponent implements FormValueControl<string> {
  private static _id = 0;

  /** Valor selecionado. `''` representa "nada selecionado". */
  readonly value = model<string>('');
  readonly disabled = input<boolean>(false);

  readonly items = input<EnumOption[]>([]);
  readonly placeholder = input<string>('');

  /** Id do botão do trigger — usa com `<label for="...">` fora de um `hlmField`. */
  readonly id = input<string>(`app-select-${SelectComponent._id++}`);
  /** Nome acessível do trigger quando não há `<label>` associado (ex.: célula de tabela). */
  readonly ariaLabel = input<string | null>(null);

  /** Classe aplicada ao host; `hlm-select` interno é `block` e herda a largura. */
  readonly class = input<ClassValue>('');
  protected readonly _computedHostClass = computed(() => hlm('block', this.class()));

  /**
   * `hlm-select` só mostra o placeholder quando o valor é `undefined`/`null`
   * (o brain-select trata `''` como "tem valor"). Traduz o sentinela `''` do
   * contrato público pra `undefined` na fronteira com o select interno.
   */
  protected readonly _innerValue = computed(() => this.value() || undefined);

  /** Rótulo exibido no trigger a partir do valor selecionado. */
  protected readonly itemToString = (value: string): string =>
    this.items().find((item) => item.value === value)?.label ?? '';
}
