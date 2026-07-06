import { Directive, input } from '@angular/core';
import { HlmButton, type ButtonVariants } from '@/shared/spartan/button';
import { classes } from '@/shared/spartan/utils';

/**
 * Botão de ação do `app-frame-header`: fundo/borda/texto seguem as cores do
 * próprio header (`bg-primary`/`text-primary-foreground`) em vez das cores
 * neutras do `hlmBtn` — variantes como `outline` usam `bg-background`, que
 * destoa sobre o fundo colorido do header.
 */
@Directive({
  selector: 'button[appFrameHeaderButton], a[appFrameHeaderButton]',
  hostDirectives: [{ directive: HlmButton, inputs: ['size'] }],
})
export class FrameHeaderButton {
  readonly size = input<ButtonVariants['size']>('default');

  constructor() {
    classes(
      () =>
        'border border-primary-foreground bg-primary text-primary-foreground hover:bg-[color-mix(in_oklch,var(--primary)_85%,black)] hover:text-primary-foreground',
    );
  }
}
