import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { CurrencyInputComponent } from '@/shared/currency-input';
import { FrameHeader } from '@/shared/frame/frame-header';
import { FramePaper } from '@/shared/frame/frame-paper';
import { HlmButton } from '@/shared/spartan/button';
import { HlmFieldImports } from '@/shared/spartan/field';
import { HlmInput } from '@/shared/spartan/input';
import { HlmSelectImports } from '@/shared/spartan/select';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRightLeft } from '@ng-icons/lucide';
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
import { toDateInputValue } from '../../shared/date-input.utils';
import { RecurringService } from '../../shared/recurring.service';
import { buildCreateRecurring, buildCreateTransaction } from '../../shared/transactions-payloads';
import { TransactionsService } from '../../shared/transactions.service';

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
    ...HlmFieldImports,
    NgIcon,
    HlmInput,
    HlmButton,
    HlmSelectImports,
    CurrencyInputComponent,
  ],
  providers: [provideIcons({ lucideArrowRightLeft })],
  template: `
    <div>
      <app-frame-header>
        <ng-icon slot="icon" name="lucideArrowRightLeft" class="text-[length:--spacing(12)]" />
        <h1 slot="title">{{ isEdit() ? 'Editar Transação' : 'Nova Transação' }}</h1>
        <p slot="subtitle">
          {{ isEdit() ? 'Atualize os detalhes da transação' : 'Registre uma receita ou despesa' }}
        </p>
      </app-frame-header>
      <app-frame-paper>
        <div class="w-full">
          <form (ngSubmit)="onSubmit()" class="grid grid-cols-6 gap-8">
            <div hlmField class="col-span-6">
              <label hlmFieldLabel for="description">Descrição</label>
              <input
                hlmInput
                type="text"
                id="description"
                [formField]="transactionForm.description"
                placeholder="Ex.: Salário, Aluguel, Mercado"
              />
              @if (errorOf(transactionForm.description()); as message) {
                <hlm-field-error forceShow>{{ message }}</hlm-field-error>
              }
            </div>

            <div hlmField class="col-span-3">
              <label hlmFieldLabel for="accountId">Conta</label>
              <hlm-select [formField]="transactionForm.accountId">
                <hlm-select-trigger class="w-full">
                  <hlm-select-value placeholder="Escolha a conta" />
                </hlm-select-trigger>
                <ng-template hlmSelectPortal>
                  <hlm-select-content>
                    @for (account of accountsService.accounts.value(); track account.id) {
                      <hlm-select-item [value]="account.id">{{ account.name }}</hlm-select-item>
                    }
                  </hlm-select-content>
                </ng-template>
              </hlm-select>
              @if (errorOf(transactionForm.accountId()); as message) {
                <hlm-field-error forceShow>{{ message }}</hlm-field-error>
              }
            </div>

            <div hlmField class="col-span-3">
              <label hlmFieldLabel for="type">Tipo</label>
              <hlm-select [formField]="transactionForm.type">
                <hlm-select-trigger class="w-full">
                  <hlm-select-value placeholder="Escolha o tipo" />
                </hlm-select-trigger>
                <ng-template hlmSelectPortal>
                  <hlm-select-content>
                    @for (type of transactionsService.types.value(); track type.value) {
                      <hlm-select-item [value]="type.value">{{ type.label }}</hlm-select-item>
                    }
                  </hlm-select-content>
                </ng-template>
              </hlm-select>
            </div>

            <div hlmField class="col-span-2">
              <label hlmFieldLabel for="category">Categoria</label>
              <hlm-select [formField]="transactionForm.category">
                <hlm-select-trigger class="w-full">
                  <hlm-select-value placeholder="Escolha a categoria" />
                </hlm-select-trigger>
                <ng-template hlmSelectPortal>
                  <hlm-select-content>
                    @for (category of categoryOptions(); track category.value) {
                      <hlm-select-item [value]="category.value">{{ category.label }}</hlm-select-item>
                    }
                  </hlm-select-content>
                </ng-template>
              </hlm-select>
              @if (errorOf(transactionForm.category()); as message) {
                <hlm-field-error forceShow>{{ message }}</hlm-field-error>
              }
            </div>

            <div hlmField class="col-span-2">
              <label hlmFieldLabel for="amount">Valor</label>
              <app-currency-input
                id="amount"
                [formField]="transactionForm.amount"
                [zCurrency]="currencySymbol()"
              />
              @if (errorOf(transactionForm.amount()); as message) {
                <hlm-field-error forceShow>{{ message }}</hlm-field-error>
              }
            </div>

            <div hlmField class="col-span-2">
              <label hlmFieldLabel for="date">Data</label>
              <input hlmInput type="date" id="date" [formField]="transactionForm.date" />
              @if (errorOf(transactionForm.date()); as message) {
                <hlm-field-error forceShow>{{ message }}</hlm-field-error>
              }
            </div>

            @if (!isEdit()) {
              <div class="col-span-6 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="repeat"
                  class="accent-primary size-4"
                  [formField]="transactionForm.repeat"
                />
                <label for="repeat" class="cursor-pointer select-none">
                  Repetir esta transação automaticamente
                </label>
              </div>

              @if (model().repeat) {
                <div hlmField class="col-span-3">
                  <label hlmFieldLabel for="frequency">Frequência</label>
                  <hlm-select [formField]="transactionForm.frequency">
                    <hlm-select-trigger class="w-full">
                      <hlm-select-value placeholder="Escolha a frequência" />
                    </hlm-select-trigger>
                    <ng-template hlmSelectPortal>
                      <hlm-select-content>
                        @for (
                          frequency of recurringService.frequencies.value();
                          track frequency.value
                        ) {
                          <hlm-select-item [value]="frequency.value">{{
                            frequency.label
                          }}</hlm-select-item>
                        }
                      </hlm-select-content>
                    </ng-template>
                  </hlm-select>
                </div>

                <div hlmField class="col-span-3">
                  <label hlmFieldLabel for="endDate">Repetir até (opcional)</label>
                  <input hlmInput type="date" id="endDate" [formField]="transactionForm.endDate" />
                </div>
              }
            }

            <div class="col-span-6 flex flex-row-reverse gap-6">
              <button
                type="submit"
                hlmBtn
                variant="default"
                [disabled]="transactionForm().invalid()"
              >
                {{ isEdit() ? 'Salvar' : 'Criar Transação' }}
              </button>
              <button type="button" hlmBtn variant="outline" (click)="cancel()">Cancelar</button>
            </div>
          </form>
        </div>
      </app-frame-paper>
    </div>
  `,
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
