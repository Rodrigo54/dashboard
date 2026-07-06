import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { CurrencyInputComponent } from '@/shared/currency-input';
import { FrameHeader } from '@/shared/frame/frame-header';
import { FramePaper } from '@/shared/frame/frame-paper';
import { ZardButtonComponent } from '@/shared/zard/components/button/button.component';
import { ZardFormModule } from '@/shared/zard/components/form/form.module';
import { ZardInputDirective } from '@/shared/zard/components/input/input.directive';
import { ZardSelectImports } from '@/shared/zard/components/select';
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
    ZardFormModule,
    NgIcon,
    ZardInputDirective,
    ZardButtonComponent,
    ZardSelectImports,
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
            <z-form-field class="col-span-6">
              <label for="description" z-form-label>Descrição</label>
              <z-form-control [errorMessage]="errorOf(transactionForm.description())">
                <input
                  z-input
                  type="text"
                  id="description"
                  [formField]="transactionForm.description"
                  placeholder="Ex.: Salário, Aluguel, Mercado"
                />
              </z-form-control>
            </z-form-field>

            <z-form-field class="col-span-3">
              <label for="accountId" z-form-label>Conta</label>
              <z-form-control [errorMessage]="errorOf(transactionForm.accountId())">
                <z-select zPlaceholder="Escolha a conta" [formField]="transactionForm.accountId">
                  @for (account of accountsService.accounts.value(); track account.id) {
                    <z-select-item [zValue]="account.id">{{ account.name }}</z-select-item>
                  }
                </z-select>
              </z-form-control>
            </z-form-field>

            <z-form-field class="col-span-3">
              <label for="type" z-form-label>Tipo</label>
              <z-form-control>
                <z-select zPlaceholder="Escolha o tipo" [formField]="transactionForm.type">
                  @for (type of transactionsService.types.value(); track type.value) {
                    <z-select-item [zValue]="type.value">{{ type.label }}</z-select-item>
                  }
                </z-select>
              </z-form-control>
            </z-form-field>

            <z-form-field class="col-span-2">
              <label for="category" z-form-label>Categoria</label>
              <z-form-control [errorMessage]="errorOf(transactionForm.category())">
                <z-select zPlaceholder="Escolha a categoria" [formField]="transactionForm.category">
                  @for (category of categoryOptions(); track category.value) {
                    <z-select-item [zValue]="category.value">{{ category.label }}</z-select-item>
                  }
                </z-select>
              </z-form-control>
            </z-form-field>

            <z-form-field class="col-span-2">
              <label for="amount" z-form-label>Valor</label>
              <z-form-control [errorMessage]="errorOf(transactionForm.amount())">
                <app-currency-input
                  id="amount"
                  [formField]="transactionForm.amount"
                  [zCurrency]="currencySymbol()"
                />
              </z-form-control>
            </z-form-field>

            <z-form-field class="col-span-2">
              <label for="date" z-form-label>Data</label>
              <z-form-control [errorMessage]="errorOf(transactionForm.date())">
                <input z-input type="date" id="date" [formField]="transactionForm.date" />
              </z-form-control>
            </z-form-field>

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
                <z-form-field class="col-span-3">
                  <label for="frequency" z-form-label>Frequência</label>
                  <z-form-control>
                    <z-select
                      zPlaceholder="Escolha a frequência"
                      [formField]="transactionForm.frequency"
                    >
                      @for (
                        frequency of recurringService.frequencies.value();
                        track frequency.value
                      ) {
                        <z-select-item [zValue]="frequency.value">{{
                          frequency.label
                        }}</z-select-item>
                      }
                    </z-select>
                  </z-form-control>
                </z-form-field>

                <z-form-field class="col-span-3">
                  <label for="endDate" z-form-label>Repetir até (opcional)</label>
                  <z-form-control>
                    <input z-input type="date" id="endDate" [formField]="transactionForm.endDate" />
                  </z-form-control>
                </z-form-field>
              }
            }

            <div class="col-span-6 flex flex-row-reverse gap-6">
              <button
                type="submit"
                z-button
                zType="default"
                [disabled]="transactionForm().invalid()"
              >
                {{ isEdit() ? 'Salvar' : 'Criar Transação' }}
              </button>
              <button type="button" z-button zType="outline" (click)="cancel()">Cancelar</button>
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
