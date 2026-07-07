import { CurrencyInputComponent } from '@/shared/currency-input';
import { FrameHeader } from '@/shared/frame/frame-header';
import { FramePaper } from '@/shared/frame/frame-paper';
import { HlmButton } from '@/shared/spartan/button';
import { HlmFieldImports } from '@/shared/spartan/field';
import { HlmInput } from '@/shared/spartan/input';
import { SelectComponent } from '@/shared/select';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLandmark } from '@ng-icons/lucide';
import { CURRENCY_SYMBOLS } from '@shared/enums';
import { createAccountSchema } from '@shared/schemas';
import { CreateAccount, UUID } from '@shared/types';
import { AccountsService } from '../../shared/accounts.service';

@Component({
  selector: 'app-accounts-form',
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
  providers: [provideIcons({ lucideLandmark })],
  template: `
    <div>
      <app-frame-header>
        <ng-icon slot="icon" name="lucideLandmark" class="text-[length:--spacing(12)]" />
        <h1 slot="title">{{ isEdit() ? 'Editar Conta Bancária' : 'Criar nova Conta Bancária' }}</h1>
        <p slot="subtitle">
          {{ isEdit() ? 'Atualize os detalhes da conta' : 'Preencha os detalhes da nova conta' }}
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
                [formField]="accountForm.name"
                placeholder="Nome"
              />
              @if (errorOf(accountForm.name()); as message) {
                <hlm-field-error forceShow>{{ message }}</hlm-field-error>
              }
            </div>
            <div hlmField class="col-span-3">
              <label hlmFieldLabel for="description">Descrição</label>
              <input
                hlmInput
                type="text"
                id="description"
                [formField]="accountForm.description!"
                placeholder="Descrição"
              />
              @if (errorOf(accountForm.description!()); as message) {
                <hlm-field-error forceShow>{{ message }}</hlm-field-error>
              }
            </div>
            <div hlmField class="col-span-2">
              <label hlmFieldLabel for="accountType">Tipo</label>
              <app-select
                id="accountType"
                [formField]="accountForm.type"
                [items]="accountsService.accountTypes.value() ?? []"
                placeholder="Escolha o tipo de conta"
              />
            </div>
            <div hlmField class="col-span-2">
              <label hlmFieldLabel for="accountProvider">Provedor</label>
              <app-select
                id="accountProvider"
                [formField]="accountForm.accountProvider!"
                [items]="accountsService.providers.value() ?? []"
                placeholder="Escolha o provedor da conta"
              />
              @if (errorOf(accountForm.accountProvider!()); as message) {
                <hlm-field-error forceShow>{{ message }}</hlm-field-error>
              }
            </div>
            <div hlmField class="col-span-2">
              <label hlmFieldLabel for="currency">Moeda</label>
              <app-select
                id="currency"
                [formField]="accountForm.currency"
                [items]="accountsService.currencies.value() ?? []"
                placeholder="Escolha a moeda"
              />
              @if (errorOf(accountForm.currency()); as message) {
                <hlm-field-error forceShow>{{ message }}</hlm-field-error>
              }
            </div>
            <div hlmField class="col-span-6">
              <label hlmFieldLabel for="balance">Saldo</label>
              <app-currency-input
                id="balance"
                [formField]="accountForm.balance"
                [zCurrency]="currencySymbol()"
              />
              @if (errorOf(accountForm.balance()); as message) {
                <hlm-field-error forceShow>{{ message }}</hlm-field-error>
              }
            </div>

            <div class="col-span-6 flex flex-row-reverse gap-6">
              <button type="submit" hlmBtn variant="default" [disabled]="accountForm().invalid()">
                {{ isEdit() ? 'Salvar' : 'Criar Conta' }}
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
export class AccountsForm {
  protected readonly accountsService = inject(AccountsService);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  /** `null` na rota `new`; o UUID da conta na rota `:accountId` (modo edição). */
  readonly #accountId = this.#route.snapshot.paramMap.get('accountId') as UUID | null;
  protected readonly isEdit = signal(this.#accountId !== null);

  protected readonly accountModel = signal<CreateAccount>({
    name: '',
    type: 'cash',
    accountProvider: '',
    balance: '',
    currency: 'BRL',
    description: '',
  });

  protected readonly currencySymbol = computed(
    () => CURRENCY_SYMBOLS[this.accountModel().currency as keyof typeof CURRENCY_SYMBOLS] ?? 'R$',
  );

  protected readonly accountForm = form(this.accountModel, (schemaPath) => {
    required(schemaPath.name, { message: 'O nome da conta é obrigatório' });
    required(schemaPath.type, { message: 'O tipo da conta é obrigatório' });
    // Validação completa contra o schema Zod compartilhado com o main (fonte única).
    validateStandardSchema(schemaPath, createAccountSchema);
  });

  constructor() {
    if (this.#accountId) void this.#loadAccount(this.#accountId);
  }

  /** Carrega a conta existente e popula o modelo do formulário (modo edição). */
  async #loadAccount(id: UUID): Promise<void> {
    const account = await this.accountsService.findOne(id);
    this.accountModel.set({
      name: account.name,
      type: account.type,
      accountProvider: account.accountProvider ?? '',
      balance: account.balance,
      currency: account.currency,
      description: account.description ?? '',
    });
  }

  onSubmit(): void {
    submit(this.accountForm, async () => {
      await this.accountsService.save(this.accountModel(), this.#accountId ?? undefined);
      this.accountsService.accounts.reload();
      await this.#router.navigate(['/accounts']);
    });
  }

  protected cancel(): void {
    void this.#router.navigate(['/accounts']);
  }

  /** Primeira mensagem de erro de um campo, apenas após ser tocado (vazia caso ok). */
  protected errorOf(field: FieldState<string>): string {
    if (!field.touched()) return '';
    return field.errors()[0]?.message ?? '';
  }
}
