import { ZardButtonComponent } from '@/shared/ui/zard/components/button/button.component';
import {
  ZardFormControlComponent,
  ZardFormFieldComponent,
  ZardFormLabelComponent,
} from '@/shared/ui/zard/components/form/form.component';
import { ZardIconComponent } from '@/shared/ui/zard/components/icon/icon.component';
import { ZardInputDirective } from '@/shared/ui/zard/components/input/input.directive';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { email, FieldState, form, FormField, minLength, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-register-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    ZardButtonComponent,
    ZardIconComponent,
    ZardFormFieldComponent,
    ZardFormControlComponent,
    ZardFormLabelComponent,
    ZardInputDirective,
    RouterLink,
  ],
  template: `
    <div class="flex items-center justify-center min-h-screen bg-background">
      <div class="flex flex-col gap-6 w-full max-w-sm px-4">
        <div class="flex flex-col items-center gap-2 text-center">
          <div
            class="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground"
          >
            <z-icon zType="user-plus" zSize="lg" />
          </div>
          <h1 class="text-2xl font-bold text-foreground">Criar conta</h1>
          <p class="text-muted-foreground text-sm">Configure seu acesso ao Dashboard</p>
        </div>

        <div class="bg-card rounded-xl shadow p-6 flex flex-col gap-4">
          @if (errorMessage()) {
            <div
              class="rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2"
            >
              {{ errorMessage() }}
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
            <z-form-field>
              <label z-form-label [for]="'name'">Nome</label>
              <z-form-control [errorMessage]="getErrorMessage(registerForm.name())">
                <input
                  z-input
                  type="text"
                  id="name"
                  placeholder="Seu nome completo"
                  [formField]="registerForm.name"
                />
              </z-form-control>
            </z-form-field>

            <z-form-field>
              <label z-form-label [for]="'email'">E-mail</label>
              <z-form-control [errorMessage]="getErrorMessage(registerForm.email())">
                <input
                  z-input
                  type="email"
                  id="email"
                  placeholder="voce@exemplo.com"
                  [formField]="registerForm.email"
                />
              </z-form-control>
            </z-form-field>

            <z-form-field>
              <label z-form-label [for]="'password'">Senha</label>
              <z-form-control [errorMessage]="getErrorMessage(registerForm.password())">

                <input
                  z-input
                  type="password"
                  id="password"
                  placeholder="Mínimo 8 caracteres"
                  [formField]="registerForm.password"
                />
              </z-form-control>
            </z-form-field>

            <z-form-field>
              <label z-form-label [for]="'confirmPassword'">Confirmar senha</label>
              <z-form-control [errorMessage]="getErrorMessage(registerForm.confirmPassword())">
                <input
                  z-input
                  type="password"
                  id="confirmPassword"
                  placeholder="Repita a senha"
                  [formField]="registerForm.confirmPassword"
                />
              </z-form-control>
            </z-form-field>

            <button
              z-button
              zType="default"
              type="submit"
              class="w-full mt-2"
              [zLoading]="loading()"
            >
              <z-icon zType="user-plus" />
              Criar conta
            </button>
          </form>
        </div>

        <p class="text-center text-sm text-muted-foreground">
          Já tem conta?
          <a [routerLink]="['/auth/login']" class="text-primary underline-offset-4 hover:underline">
            Entrar
          </a>
        </p>
      </div>
    </div>
  `,
  styles: ``,
})
export class RegisterPage {
  readonly #auth = inject(AuthService);
  readonly #router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly model = signal({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  protected readonly registerForm = form(this.model, (s) => {
    required(s.name, { message: 'Nome é obrigatório' });
    required(s.email, { message: 'E-mail é obrigatório' });
    email(s.email, { message: 'E-mail inválido' });
    required(s.password, { message: 'Senha é obrigatória' });
    minLength(s.password, 8, { message: 'Senha deve ter no mínimo 8 caracteres' });
    required(s.confirmPassword, { message: 'Confirmação de senha é obrigatória' });
    validate(s.confirmPassword, ({ value, valueOf }) => {
      if (value() !== valueOf(s.password)) {
        return { kind: 'mismatch', message: 'As senhas não coincidem' };
      }
      return undefined;
    });
  });

  protected getErrorMessage(field: FieldState<string>): string {
    if (!field.touched()) {
      return '';
    }
    const errors = field.errors();
    if (errors.length > 0) {
      return errors[0].message || '';
    }
    return '';
  }

  protected onSubmit(): void {
    submit(this.registerForm, async () => {
      this.loading.set(true);
      this.errorMessage.set('');
      try {
        const { name, email, password } = this.model();
        await this.#auth.register(name, email, password);
        this.#router.navigate(['/home']);
      } catch (err) {
        this.errorMessage.set(err instanceof Error ? err.message : 'Erro ao criar conta');
      } finally {
        this.loading.set(false);
      }
    });
  }
}
