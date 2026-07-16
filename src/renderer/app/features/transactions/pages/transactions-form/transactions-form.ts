import { RecurringService } from '@/features/recurring/shared/recurring.service';
import { CurrencyInputComponent } from '@/shared/currency-input';
import { FrameHeader } from '@/shared/frame/frame-header';
import { FramePaper } from '@/shared/frame/frame-paper';
import { HlmButton } from '@/shared/spartan/button';
import { HlmFieldImports } from '@/shared/spartan/field';
import { HlmInput } from '@/shared/spartan/input';
import { SelectComponent } from '@/shared/select';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRightLeft } from '@ng-icons/lucide';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, required, submit, validateStandardSchema } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import type { RecurringFrequency, TransactionCategory, TransactionType } from '@shared/enums';
import { positiveDecimalSchema } from '@shared/schemas';
import type { Recurring, UUID } from '@shared/types';
import { toDateInputValue } from '../../shared/date-input.utils';
import { LedgerInvalidationService } from '../../shared/ledger-invalidation.service';
import { RecurringRuleSummary } from '../../shared/recurring-rule-summary';
import {
  fieldErrorOf,
  TransactionFormFieldsService,
  type TransactionCoreFields,
} from '../../shared/transaction-form-fields.service';
import {
  buildCreateRecurring,
  buildCreateTransaction,
  buildRecurringPrefillParams,
} from '../../shared/transactions-payloads';
import { TransactionsService } from '../../shared/transactions.service';

/** Modelo do form: datas como string de `<input type="date">`. */
export interface TransactionFormModel extends TransactionCoreFields {
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
    SelectComponent,
    CurrencyInputComponent,
    RecurringRuleSummary,
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
              <app-select
                id="accountId"
                [formField]="transactionForm.accountId"
                [items]="accountItems()"
                placeholder="Escolha a conta"
              />
              @if (errorOf(transactionForm.accountId()); as message) {
                <hlm-field-error forceShow>{{ message }}</hlm-field-error>
              }
            </div>

            <div hlmField class="col-span-3">
              <label hlmFieldLabel for="type">Tipo</label>
              <app-select
                id="type"
                [formField]="transactionForm.type"
                [items]="transactionsService.types.value() ?? []"
                placeholder="Escolha o tipo"
              />
            </div>

            <div hlmField class="col-span-2">
              <label hlmFieldLabel for="category">Categoria</label>
              <app-select
                id="category"
                [formField]="transactionForm.category"
                [items]="categoryOptions()"
                placeholder="Escolha a categoria"
              />
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

            @if (isEdit()) {
              <div class="col-span-6">
                @if (linkedRule(); as rule) {
                  <app-recurring-rule-summary [rule]="rule" />
                } @else {
                  <button
                    type="button"
                    hlmBtn
                    variant="outline"
                    size="sm"
                    (click)="createRecurring()"
                  >
                    Criar recorrência a partir desta transação
                  </button>
                }
              </div>
            }

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
                  <app-select
                    id="frequency"
                    [formField]="transactionForm.frequency"
                    [items]="recurringService.frequencies.value() ?? []"
                    placeholder="Escolha a frequência"
                  />
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
  readonly #formFields = inject(TransactionFormFieldsService);
  readonly #ledgerInvalidation = inject(LedgerInvalidationService);
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

  protected readonly currencySymbol = this.#formFields.currencySymbol(this.model);
  protected readonly categoryOptions = this.#formFields.categoryOptions(this.model);
  protected readonly accountItems = this.#formFields.accountItems();

  /** Regra vinculada à transação em edição, se houver — bloco somente-leitura. */
  protected readonly linkedRule = signal<Recurring | undefined>(undefined);

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
    this.#formFields.wireCategoryReset(this.model);
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
    if (transaction.recurringId) {
      this.linkedRule.set(await this.recurringService.findOne(transaction.recurringId));
    }
  }

  /** Navega para `/recurring/new` prefilado com os dados desta transação. */
  protected async createRecurring(): Promise<void> {
    const model = this.model();
    await this.#router.navigate(['/recurring/new'], {
      queryParams: buildRecurringPrefillParams({
        ...model,
        category: model.category as TransactionCategory,
      }),
    });
  }

  protected onSubmit(): void {
    submit(this.transactionForm, async () => {
      const model = this.model();
      if (model.repeat && !this.isEdit()) {
        await this.recurringService.create(buildCreateRecurring(model));
        this.#ledgerInvalidation.reloadRules();
      } else {
        await this.transactionsService.save(
          buildCreateTransaction(model),
          this.#transactionId ?? undefined,
        );
      }
      // Saldo e listagem mudam em qualquer um dos caminhos.
      this.#ledgerInvalidation.reloadBalanceAffectingData();
      await this.#router.navigate(['/transactions']);
    });
  }

  protected cancel(): void {
    void this.#router.navigate(['/transactions']);
  }

  protected readonly errorOf = fieldErrorOf;
}
