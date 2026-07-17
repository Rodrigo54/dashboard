import { GoBackService } from '@/core/navigation/go-back.service';
import { CurrencyInputComponent } from '@/shared/currency-input';
import { FrameHeader } from '@/shared/frame/frame-header';
import { FramePaper } from '@/shared/frame/frame-paper';
import { HlmButton } from '@/shared/spartan/button';
import { HlmFieldImports } from '@/shared/spartan/field';
import { HlmInput } from '@/shared/spartan/input';
import { SelectComponent } from '@/shared/select';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRepeat } from '@ng-icons/lucide';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, required, submit, validateStandardSchema } from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';
import type { RecurringFrequency } from '@shared/enums';
import { positiveDecimalSchema } from '@shared/schemas';
import type { TransactionTemplate, UUID } from '@shared/types';
import { toDateInputValue } from '@/features/transactions/shared/date-input.utils';
import { LedgerInvalidationService } from '@/features/transactions/shared/ledger-invalidation.service';
import {
  fieldErrorOf,
  TransactionFormFieldsService,
  type TransactionCoreFields,
} from '@/features/transactions/shared/transaction-form-fields.service';
import {
  buildCreateRecurringFromRule,
  buildUpdateRecurring,
} from '@/features/transactions/shared/transactions-payloads';
import { TransactionsService } from '@/features/transactions/shared/transactions.service';
import { RecurringService } from '../../shared/recurring.service';

/** Modelo do form de criação/edição de regra: datas como string de `<input type="date">`. */
export interface RecurringFormModel extends TransactionCoreFields {
  name: string;
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
    ...HlmFieldImports,
    NgIcon,
    HlmInput,
    HlmButton,
    SelectComponent,
    CurrencyInputComponent,
  ],
  providers: [provideIcons({ lucideRepeat })],
  template: `
    <div>
      <app-frame-header>
        <ng-icon slot="icon" name="lucideRepeat" class="text-[length:--spacing(12)]" />
        <h1 slot="title">{{ isEdit() ? 'Editar Recorrência' : 'Nova Recorrência' }}</h1>
        <p slot="subtitle">
          {{
            isEdit()
              ? 'As alterações valem para os próximos lançamentos; os já gerados não mudam'
              : 'Ocorrências já vencidas (início no passado) são lançadas na hora'
          }}
        </p>
      </app-frame-header>
      <app-frame-paper>
        <div class="w-full">
          <form (ngSubmit)="onSubmit()" class="grid grid-cols-6 gap-8">
            <div hlmField class="col-span-3">
              <label hlmFieldLabel for="name">Nome</label>
              <input
                hlmInput
                type="text"
                id="name"
                [formField]="recurringForm.name"
                placeholder="Ex.: Salário, Aluguel"
              />
              @if (errorOf(recurringForm.name()); as message) {
                <hlm-field-error forceShow>{{ message }}</hlm-field-error>
              }
            </div>

            <div hlmField class="col-span-3">
              <label hlmFieldLabel for="description">Descrição dos lançamentos</label>
              <input
                hlmInput
                type="text"
                id="description"
                [formField]="recurringForm.description"
                placeholder="Descrição usada nas transações geradas"
              />
              @if (errorOf(recurringForm.description()); as message) {
                <hlm-field-error forceShow>{{ message }}</hlm-field-error>
              }
            </div>

            <div hlmField class="col-span-3">
              <label hlmFieldLabel for="accountId">Conta</label>
              <app-select
                id="accountId"
                [formField]="recurringForm.accountId"
                [items]="accountItems()"
                placeholder="Escolha a conta"
              />
              @if (errorOf(recurringForm.accountId()); as message) {
                <hlm-field-error forceShow>{{ message }}</hlm-field-error>
              }
            </div>

            <div hlmField class="col-span-3">
              <label hlmFieldLabel for="type">Tipo</label>
              <app-select
                id="type"
                [formField]="recurringForm.type"
                [items]="transactionsService.types.value() ?? []"
                placeholder="Escolha o tipo"
              />
            </div>

            <div hlmField class="col-span-2">
              <label hlmFieldLabel for="category">Categoria</label>
              <app-select
                id="category"
                [formField]="recurringForm.category"
                [items]="categoryOptions()"
                placeholder="Escolha a categoria"
              />
              @if (errorOf(recurringForm.category()); as message) {
                <hlm-field-error forceShow>{{ message }}</hlm-field-error>
              }
            </div>

            <div hlmField class="col-span-2">
              <label hlmFieldLabel for="amount">Valor</label>
              <app-currency-input
                id="amount"
                [formField]="recurringForm.amount"
                [zCurrency]="currencySymbol()"
              />
              @if (errorOf(recurringForm.amount()); as message) {
                <hlm-field-error forceShow>{{ message }}</hlm-field-error>
              }
            </div>

            <div hlmField class="col-span-2">
              <label hlmFieldLabel for="frequency">Frequência</label>
              <app-select
                id="frequency"
                [formField]="recurringForm.frequency"
                [items]="recurringService.frequencies.value() ?? []"
                placeholder="Escolha a frequência"
              />
            </div>

            <div hlmField class="col-span-3">
              <label hlmFieldLabel for="startDate">Início</label>
              <input hlmInput type="date" id="startDate" [formField]="recurringForm.startDate" />
              @if (errorOf(recurringForm.startDate()); as message) {
                <hlm-field-error forceShow>{{ message }}</hlm-field-error>
              }
            </div>

            <div hlmField class="col-span-3">
              <label hlmFieldLabel for="endDate">Repetir até (opcional)</label>
              <input hlmInput type="date" id="endDate" [formField]="recurringForm.endDate" />
            </div>

            <div class="col-span-6 flex flex-row-reverse gap-6">
              <button type="submit" hlmBtn variant="default" [disabled]="recurringForm().invalid()">
                {{ isEdit() ? 'Salvar' : 'Criar Recorrência' }}
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
export class RecurringForm {
  protected readonly transactionsService = inject(TransactionsService);
  protected readonly recurringService = inject(RecurringService);
  readonly #formFields = inject(TransactionFormFieldsService);
  readonly #ledgerInvalidation = inject(LedgerInvalidationService);
  readonly #goBack = inject(GoBackService);
  readonly #route = inject(ActivatedRoute);

  /** `null` na rota `new`; o UUID da regra na rota `edit/:recurringId`. */
  readonly #recurringId = this.#route.snapshot.paramMap.get('recurringId') as UUID | null;
  protected readonly isEdit = computed(() => this.#recurringId !== null);

  protected readonly model = signal<RecurringFormModel>(this.#buildInitialModel());

  protected readonly currencySymbol = this.#formFields.currencySymbol(this.model);
  protected readonly categoryOptions = this.#formFields.categoryOptions(this.model);
  protected readonly accountItems = this.#formFields.accountItems();

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
    if (this.#recurringId) void this.#loadRule(this.#recurringId);
    this.#formFields.wireCategoryReset(this.model);
  }

  /**
   * Modo criação: prefill via query params (fluxo "Criar recorrência a
   * partir desta transação" da transactions-view/-form) — frequência e
   * datas ficam sempre a critério do usuário, nunca vêm de query param.
   */
  #buildInitialModel(): RecurringFormModel {
    const qp = this.#route.snapshot.queryParamMap;
    const description = qp.get('description') ?? '';
    const type = qp.get('type') === 'income' ? 'income' : 'expense';
    return {
      name: description,
      accountId: qp.get('accountId') ?? '',
      type,
      category: qp.get('category') ?? '',
      amount: qp.get('amount') ?? '',
      description,
      frequency: 'monthly',
      startDate: toDateInputValue(new Date()),
      endDate: '',
    };
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
      if (this.#recurringId) {
        await this.recurringService.update(this.#recurringId, buildUpdateRecurring(this.model()));
      } else {
        await this.recurringService.create(buildCreateRecurringFromRule(this.model()));
      }
      // A mutação pode materializar ocorrências vencidas e mexer em saldos.
      this.#ledgerInvalidation.reloadRules();
      this.#ledgerInvalidation.reloadBalanceAffectingData();
      this.#goBack.goBackOr('/transactions');
    });
  }

  protected cancel(): void {
    this.#goBack.goBackOr('/transactions');
  }

  protected readonly errorOf = fieldErrorOf;
}
