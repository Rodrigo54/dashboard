import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Recurring, TransactionTemplate } from '@shared/types';

/** Bloco somente-leitura da regra vinculada a uma transação — usado por transactions-form e -view. */
@Component({
  selector: 'app-recurring-rule-summary',
  template: `
    <div class="border-border bg-muted/20 rounded-lg border p-4">
      <p class="text-muted-foreground text-sm">Recorrência vinculada</p>
      <p class="font-medium">{{ rule().name }}</p>
      <p class="text-muted-foreground text-sm">{{ templateOf().description }}</p>
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringRuleSummary {
  readonly rule = input.required<Recurring>();

  protected templateOf(): TransactionTemplate {
    return this.rule().template as TransactionTemplate;
  }
}
