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
import type { UUID } from '@shared/types';
import { toDateInputValue } from './date-input.utils';
import { RecurringService } from './recurring.service';
import { buildCreateRecurring, buildCreateTransaction } from './transaction-payloads';
import { TransactionsService } from './transactions.service';

/** Modelo do form: datas como string de `<input type="date">`. */
export interface TransactionFormModel {
  accountId: string;
  type: Exclude<TransactionType, 'transfer'>;
  category: string;
  amount: string;
  description: string;
  date: string;
  repeat: boolean;
  frequency: RecurringFrequency;
  endDate: string;
}

@Component({
  selector: 'app-transactions-form',
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
  templateUrl: './transactions-form.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsForm {
  protected readonly transactionsService = inject(TransactionsService);
  protected readonly recurringService = inject(RecurringService);
  protected readonly accountsService = inject(AccountsService);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  /** `null` na rota `new`; o UUID da transação na rota `:transactionId`. */
  readonly #transactionId = this.#route.snapshot.paramMap.get('transactionId') as UUID | null;
  protected readonly isEdit = signal(this.#transactionId !== null);

  protected readonly model = signal<TransactionFormModel>({
    accountId: '',
    type: 'expense',
    category: '',
    amount: '',
    description: '',
    date: toDateInputValue(new Date()),
    repeat: false,
    frequency: 'monthly',
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

  protected readonly transactionForm = form(this.model, (schemaPath) => {
    required(schemaPath.accountId, { message: 'A conta é obrigatória' });
    required(schemaPath.category, { message: 'A categoria é obrigatória' });
    required(schemaPath.description, { message: 'A descrição é obrigatória' });
    required(schemaPath.amount, { message: 'O valor é obrigatório' });
    required(schemaPath.date, { message: 'A data é obrigatória' });
    validateStandardSchema(schemaPath.amount, positiveDecimalSchema);
  });

  constructor() {
    if (this.#transactionId) void this.#loadTransaction(this.#transactionId);

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

  async #loadTransaction(id: UUID): Promise<void> {
    const transaction = await this.transactionsService.findOne(id);
    if (transaction.type === 'transfer') return;
    this.model.update((m) => ({
      ...m,
      accountId: transaction.accountId,
      type: transaction.type as Exclude<TransactionType, 'transfer'>,
      category: transaction.category,
      amount: transaction.amount,
      description: transaction.description,
      date: toDateInputValue(new Date(transaction.date)),
    }));
  }

  protected onSubmit(): void {
    submit(this.transactionForm, async () => {
      const model = this.model();
      if (model.repeat && !this.isEdit()) {
        await this.recurringService.create(buildCreateRecurring(model));
        this.recurringService.rules.reload();
      } else {
        await this.transactionsService.save(
          buildCreateTransaction(model),
          this.#transactionId ?? undefined,
        );
      }
      // Saldo e listagem mudam em qualquer um dos caminhos.
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
