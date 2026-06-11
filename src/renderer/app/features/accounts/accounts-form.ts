import { FrameHeader } from '@/shared/ui/frame/frame-header';
import { FramePaper } from '@/shared/ui/frame/frame-paper';
import { ZardButtonComponent } from '@/shared/ui/zard/components/button/button.component';
import { ZardFormModule } from '@/shared/ui/zard/components/form/form.module';
import { ZardIconComponent } from '@/shared/ui/zard/components/icon/icon.component';
import { ZardInputDirective } from '@/shared/ui/zard/components/input/input.directive';
import { ZardSelectImports } from '@/shared/ui/zard/components/select';
import { CurrencyInputComponent } from '@/shared/ui/currency-input';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { createAccountSchema } from '@shared/schemas';
import { CreateAccount, UUID } from '@shared/types';
import { AccountsService } from './accounts.service';

@Component({
  selector: 'app-accounts-form',
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
  template: `
    <div>
      <app-frame-header>
        <z-icon slot="icon" zSize="4xl" zType="landmark"></z-icon>
        <h1 slot="title">{{ isEdit() ? 'Editar Conta Bancária' : 'Criar nova Conta Bancária' }}</h1>
        <p slot="subtitle">
          {{ isEdit() ? 'Atualize os detalhes da conta' : 'Preencha os detalhes da nova conta' }}
        </p>
      </app-frame-header>
      <app-frame-paper>
        <div class="w-full">
          <form (ngSubmit)="onSubmit()" class="grid grid-cols-6 gap-8">
            <z-form-field class="col-span-3">
              <label for="name" z-form-label>Nome</label>
              <z-form-control [errorMessage]="errorOf(accountForm.name())">
                <input
                  z-input
                  type="text"
                  id="name"
                  [formField]="accountForm.name"
                  placeholder="Nome"
                />
              </z-form-control>
            </z-form-field>
            <z-form-field class="col-span-3">
              <label for="description" z-form-label>Descrição</label>
              <z-form-control [errorMessage]="errorOf(accountForm.description!())">
                <input
                  z-input
                  type="text"
                  id="description"
                  [formField]="accountForm.description!"
                  placeholder="Descrição"
                />
              </z-form-control>
            </z-form-field>
            <z-form-field class="col-span-2">
              <label for="accountType" z-form-label>Tipo</label>
              <z-form-control>
                <z-select zPlaceholder="Escolha o tipo de conta" [formField]="accountForm.type">
                  @for (type of accountsService.accountTypes.value(); track type.value) {
                    <z-select-item [zValue]="type.value">{{ type.label }}</z-select-item>
                  }
                </z-select>
              </z-form-control>
            </z-form-field>
            <z-form-field class="col-span-2">
              <label for="accountProvider" z-form-label>Provedor</label>
              <z-form-control [errorMessage]="errorOf(accountForm.accountProvider!())">
                <z-select
                  zPlaceholder="Escolha o provedor da conta"
                  [formField]="accountForm.accountProvider!"
                >
                  @for (provider of accountsService.providers.value(); track provider.value) {
                    <z-select-item [zValue]="provider.value">{{ provider.label }}</z-select-item>
                  }
                </z-select>
              </z-form-control>
            </z-form-field>
            <z-form-field class="col-span-2">
              <label for="currency" z-form-label>Moeda</label>
              <z-form-control [errorMessage]="errorOf(accountForm.currency!())">
                <z-select zPlaceholder="Escolha a moeda" [formField]="accountForm.currency!">
                  @for (currency of accountsService.currencies.value(); track currency.value) {
                    <z-select-item [zValue]="currency.value">{{ currency.label }}</z-select-item>
                  }
                </z-select>
              </z-form-control>
            </z-form-field>
            <z-form-field class="col-span-6">
              <label for="balance" z-form-label>Saldo</label>
              <z-form-control [errorMessage]="errorOf(accountForm.balance())">
                <app-currency-input id="balance" [formField]="accountForm.balance" />
              </z-form-control>
            </z-form-field>

            <div class="col-span-6 flex flex-row-reverse gap-6">
              <button type="submit" z-button zType="default" [disabled]="accountForm().invalid()">
                {{ isEdit() ? 'Salvar' : 'Criar Conta' }}
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
    currency: '',
    description: '',
  });

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
