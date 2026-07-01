import { AccountsService } from '@/features/accounts/accounts.service';
import { CurrencyInputComponent } from '@/shared/ui/currency-input';
import { FrameHeader } from '@/shared/ui/frame/frame-header';
import { FramePaper } from '@/shared/ui/frame/frame-paper';
import { ZardButtonComponent } from '@/shared/ui/zard/components/button/button.component';
import { ZardFormModule } from '@/shared/ui/zard/components/form/form.module';
import { ZardIconComponent } from '@/shared/ui/zard/components/icon/icon.component';
import { ZardInputDirective } from '@/shared/ui/zard/components/input/input.directive';
import { ZardSelectImports } from '@/shared/ui/zard/components/select';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  FieldState,
  form,
  FormField,
  required,
  submit,
  validateStandardSchema,
} from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { CURRENCY_SYMBOLS, type RecurringFrequency, type TransactionType } from '@shared/enums';
import { positiveDecimalSchema } from '@shared/schemas';
import type { TransactionTemplate, UUID } from '@shared/types';
import { toDateInputValue } from './date-input.utils';
import { RecurringService } from './recurring.service';
import { buildUpdateRecurring } from './transaction-payloads';
import { TransactionsService } from './transactions.service';

/** Modelo do form de edição de regra: datas como string de `<input type="date">`. */
export interface RecurringFormModel {
  name: string;
  accountId: string;
  type: Exclude<TransactionType, 'transfer'>;
  category: string;
  amount: string;
  description: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-recurring-form',
  imports: [
    FormField,
    FormsModule,
    FrameHeader,
    FramePaper,
    ZardFormModule,
    ZardIconComponent,
    ZardInputDirective,
    ZardButtonComponent,
    ZardSelectImports,
    CurrencyInputComponent,
  ],
  templateUrl: './recurring-form.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringForm {
  protected readonly transactionsService = inject(TransactionsService);
  protected readonly recurringService = inject(RecurringService);
  protected readonly accountsService = inject(AccountsService);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  readonly #recurringId = this.#route.snapshot.paramMap.get('recurringId') as UUID;

  protected readonly model = signal<RecurringFormModel>({
    name: '',
    accountId: '',
    type: 'expense',
    category: '',
    amount: '',
    description: '',
    frequency: 'monthly',
    startDate: toDateInputValue(new Date()),
    endDate: '',
  });

  /** Símbolo da moeda da conta selecionada (R$ enquanto nenhuma escolhida). */
  protected readonly currencySymbol = computed(() => {
    const account = this.accountsService.accounts
      .value()
      ?.find((a) => a.id === this.model().accountId);
    const currency = (account?.currency ?? 'BRL') as keyof typeof CURRENCY_SYMBOLS;
    return CURRENCY_SYMBOLS[currency] ?? 'R$';
  });

  /** Categorias compatíveis com o tipo selecionado. */
  protected readonly categoryOptions = computed(() => {
    const groups = this.transactionsService.categories.value();
    return (this.model().type === 'income' ? groups?.income : groups?.expense) ?? [];
  });

  protected readonly recurringForm = form(this.model, (schemaPath) => {
    required(schemaPath.name, { message: 'O nome é obrigatório' });
    required(schemaPath.accountId, { message: 'A conta é obrigatória' });
    required(schemaPath.category, { message: 'A categoria é obrigatória' });
    required(schemaPath.description, { message: 'A descrição é obrigatória' });
    required(schemaPath.amount, { message: 'O valor é obrigatório' });
    required(schemaPath.startDate, { message: 'A data de início é obrigatória' });
    validateStandardSchema(schemaPath.amount, positiveDecimalSchema);
  });

  constructor() {
    void this.#loadRule(this.#recurringId);

    // Trocar o tipo invalida a categoria escolhida para o tipo anterior.
    effect(() => {
      const { type, category } = this.model();
      const groups = this.transactionsService.categories.value();
      const valid = (type === 'income' ? groups?.income : groups?.expense) ?? [];
      if (category && groups && !valid.some((o) => o.value === category)) {
        this.model.update((m) => ({ ...m, category: '' }));
      }
    });
  }

  async #loadRule(id: UUID): Promise<void> {
    const rule = await this.recurringService.findOne(id);
    const template = rule.template as TransactionTemplate;
    if (template.type === 'transfer') return;
    this.model.set({
      name: rule.name,
      accountId: template.accountId,
      type: template.type,
      category: template.category,
      amount: template.amount,
      description: template.description,
      frequency: rule.recurringPattern.frequency,
      startDate: toDateInputValue(new Date(rule.startDate)),
      endDate: rule.endDate ? toDateInputValue(new Date(rule.endDate)) : '',
    });
  }

  protected onSubmit(): void {
    submit(this.recurringForm, async () => {
      await this.recurringService.update(this.#recurringId, buildUpdateRecurring(this.model()));
      // A atualização pode materializar ocorrências e mexer em saldos.
      this.recurringService.rules.reload();
      this.transactionsService.transactions.reload();
      this.accountsService.accounts.reload();
      await this.#router.navigate(['/transactions']);
    });
  }

  protected cancel(): void {
    void this.#router.navigate(['/transactions']);
  }

  /** Primeira mensagem de erro de um campo, apenas após ser tocado (vazia caso ok). */
  protected errorOf(field: FieldState<string>): string {
    if (!field.touched()) return '';
    return field.errors()[0]?.message ?? '';
  }
}
