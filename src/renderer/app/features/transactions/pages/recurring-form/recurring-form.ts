import { AccountsService } from '@/features/accounts/shared/accounts.service';
import { CurrencyInputComponent } from '@/shared/currency-input';
import { FrameHeader } from '@/shared/frame/frame-header';
import { FramePaper } from '@/shared/frame/frame-paper';
import { HlmButton } from '@/shared/spartan/button';
import { ZardFormModule } from '@/shared/zard/components/form/form.module';
import { HlmInput } from '@/shared/spartan/input';
import { HlmSelectImports } from '@/shared/spartan/select';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRepeat } from '@ng-icons/lucide';
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
import { toDateInputValue } from '../../shared/date-input.utils';
import { RecurringService } from '../../shared/recurring.service';
import { buildUpdateRecurring } from '../../shared/transactions-payloads';
import { TransactionsService } from '../../shared/transactions.service';

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
    NgIcon,
    HlmInput,
    HlmButton,
    HlmSelectImports,
    CurrencyInputComponent,
  ],
  providers: [provideIcons({ lucideRepeat })],
  template: `
    <div>
      <app-frame-header>
        <ng-icon slot="icon" name="lucideRepeat" class="text-[length:--spacing(12)]" />
        <h1 slot="title">Editar Recorrência</h1>
        <p slot="subtitle">
          As alterações valem para os próximos lançamentos; os já gerados não mudam
        </p>
      </app-frame-header>
      <app-frame-paper>
        <div class="w-full">
          <form (ngSubmit)="onSubmit()" class="grid grid-cols-6 gap-8">
            <z-form-field class="col-span-3">
              <label for="name" z-form-label>Nome</label>
              <z-form-control [errorMessage]="errorOf(recurringForm.name())">
                <input
                  hlmInput
                  type="text"
                  id="name"
                  [formField]="recurringForm.name"
                  placeholder="Ex.: Salário, Aluguel"
                />
              </z-form-control>
            </z-form-field>

            <z-form-field class="col-span-3">
              <label for="description" z-form-label>Descrição dos lançamentos</label>
              <z-form-control [errorMessage]="errorOf(recurringForm.description())">
                <input
                  hlmInput
                  type="text"
                  id="description"
                  [formField]="recurringForm.description"
                  placeholder="Descrição usada nas transações geradas"
                />
              </z-form-control>
            </z-form-field>

            <z-form-field class="col-span-3">
              <label for="accountId" z-form-label>Conta</label>
              <z-form-control [errorMessage]="errorOf(recurringForm.accountId())">
                <hlm-select [formField]="recurringForm.accountId">
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
              </z-form-control>
            </z-form-field>

            <z-form-field class="col-span-3">
              <label for="type" z-form-label>Tipo</label>
              <z-form-control>
                <hlm-select [formField]="recurringForm.type">
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
              </z-form-control>
            </z-form-field>

            <z-form-field class="col-span-2">
              <label for="category" z-form-label>Categoria</label>
              <z-form-control [errorMessage]="errorOf(recurringForm.category())">
                <hlm-select [formField]="recurringForm.category">
                  <hlm-select-trigger class="w-full">
                    <hlm-select-value placeholder="Escolha a categoria" />
                  </hlm-select-trigger>
                  <ng-template hlmSelectPortal>
                    <hlm-select-content>
                      @for (category of categoryOptions(); track category.value) {
                        <hlm-select-item [value]="category.value">{{
                          category.label
                        }}</hlm-select-item>
                      }
                    </hlm-select-content>
                  </ng-template>
                </hlm-select>
              </z-form-control>
            </z-form-field>

            <z-form-field class="col-span-2">
              <label for="amount" z-form-label>Valor</label>
              <z-form-control [errorMessage]="errorOf(recurringForm.amount())">
                <app-currency-input
                  id="amount"
                  [formField]="recurringForm.amount"
                  [zCurrency]="currencySymbol()"
                />
              </z-form-control>
            </z-form-field>

            <z-form-field class="col-span-2">
              <label for="frequency" z-form-label>Frequência</label>
              <z-form-control>
                <hlm-select [formField]="recurringForm.frequency">
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
              </z-form-control>
            </z-form-field>

            <z-form-field class="col-span-3">
              <label for="startDate" z-form-label>Início</label>
              <z-form-control [errorMessage]="errorOf(recurringForm.startDate())">
                <input hlmInput type="date" id="startDate" [formField]="recurringForm.startDate" />
              </z-form-control>
            </z-form-field>

            <z-form-field class="col-span-3">
              <label for="endDate" z-form-label>Repetir até (opcional)</label>
              <z-form-control>
                <input hlmInput type="date" id="endDate" [formField]="recurringForm.endDate" />
              </z-form-control>
            </z-form-field>

            <div class="col-span-6 flex flex-row-reverse gap-6">
              <button type="submit" hlmBtn variant="default" [disabled]="recurringForm().invalid()">
                Salvar
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
