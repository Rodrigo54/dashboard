import { FrameHeader } from '@/shared/ui/frame/frame-header';
import { FramePaper } from '@/shared/ui/frame/frame-paper';
import { ZardButtonComponent } from '@/shared/ui/zard/components/button/button.component';
import { ZardFormModule } from '@/shared/ui/zard/components/form/form.module';
import { ZardIconComponent } from '@/shared/ui/zard/components/icon/icon.component';
import { ZardInputDirective } from '@/shared/ui/zard/components/input/input.directive';
import { ZardSelectImports } from '@/shared/ui/zard/components/select';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, required } from '@angular/forms/signals';
import { CreateAccount } from '@shared/types';

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
  ],
  template: `
    <div>
      <app-frame-header>
        <z-icon slot="icon" zSize="4xl" zType="landmark"></z-icon>
        <h1 slot="title">Criar nova Conta Bancária</h1>
        <p slot="subtitle">Preencha os detalhes da nova conta</p>
      </app-frame-header>
      <app-frame-paper>
        <div class="w-full">
          <form (ngSubmit)="onSubmit()" class="grid grid-cols-6 gap-8">
            <z-form-field class="col-span-3">
              <label for="name" z-form-label>Nome</label>
              <z-form-control>
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
              <z-form-control>
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
                  @for (type of accountTypesResource.value(); track type.value) {
                    <z-select-item [zValue]="type.value">{{ type.label }}</z-select-item>
                  }
                </z-select>
              </z-form-control>
            </z-form-field>
            <z-form-field class="col-span-2">
              <label for="accountProvider" z-form-label>Provedor</label>
              <z-form-control>
                <z-select
                  zPlaceholder="Escolha o provedor da conta"
                  [formField]="accountForm.accountProvider!"
                >
                  @for (provider of accountsProvidersResource.value(); track provider.value) {
                    <z-select-item [zValue]="provider.value">{{ provider.label }}</z-select-item>
                  }
                </z-select>
              </z-form-control>
            </z-form-field>
            <z-form-field class="col-span-2">
              <label for="currency" z-form-label>Moeda</label>
              <z-form-control>
                <z-select zPlaceholder="Escolha a moeda" [formField]="accountForm.currency!">
                  @for (currency of currenciesResource.value(); track currency.value) {
                    <z-select-item [zValue]="currency.value">{{ currency.label }}</z-select-item>
                  }
                </z-select>
              </z-form-control>
            </z-form-field>
            <z-form-field class="col-span-6">
              <label for="balance" z-form-label>Saldo</label>
              <z-form-control>
                <input
                  z-input
                  type="text"
                  id="balance"
                  [formField]="accountForm.balance"
                  placeholder="Saldo"
                />
              </z-form-control>
            </z-form-field>

            <div class="col-span-6 flex flex-row-reverse gap-6">
              <button type="submit" z-button zType="default">Criar Conta</button>
              <button type="submit" z-button zType="outline">Cancelar</button>
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
  accountModel = signal<CreateAccount>({
    name: '',
    type: 'cash',
    accountProvider: '',
    balance: '',
    currency: '',
    description: '',
  });

  accountForm = form(this.accountModel, (schemaPath) => {
    required(schemaPath.name, { message: 'O nome da conta é obrigatório' });
    required(schemaPath.type, { message: 'O tipo da conta é obrigatório' });
  });

  accountTypesResource = httpResource<{ value: string; label: string }[]>(
    () => '/api/accounts/types',
  );

  accountsProvidersResource = httpResource<{ value: string; label: string }[]>(
    () => '/api/accounts/providers',
  );

  currenciesResource = httpResource<{ value: string; label: string }[]>(
    () => '/api/accounts/currencies',
  );

  onSubmit() {
    const formValue = this.accountForm().value();
    console.log('Formulário enviado:', formValue);
  }
}
