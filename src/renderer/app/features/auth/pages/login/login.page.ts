import { ZardButtonComponent } from '@/shared/ui/zard/components/button/button.component';
import {
  ZardFormControlComponent,
  ZardFormFieldComponent,
  ZardFormLabelComponent,
} from '@/shared/ui/zard/components/form/form.component';
import { ZardIconComponent } from '@/shared/ui/zard/components/icon/icon.component';
import { ZardInputDirective } from '@/shared/ui/zard/components/input/input.directive';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { email, FieldState, form, FormField, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-login-page',
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
    <div class="flex items-center justify-center min-h-screen">
      <div class="flex flex-col gap-6 w-full max-w-sm px-4">
        <div class="bg-card rounded-xl shadow p-6 flex flex-col gap-4">
          <div class="flex flex-col items-center gap-2 text-center">
            <div class="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground">
              <z-icon zType="layout-dashboard" zSize="lg" />
            </div>
            <h1 class="text-2xl font-bold text-foreground">Entrar</h1>
            <p class="text-muted-foreground text-sm">Acesse sua conta do Dashboard</p>
          </div>
          @if (errorMessage()) {
            <div class="rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2">
              {{ errorMessage() }}
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
            <z-form-field>
              <label z-form-label [for]="'email'">E-mail</label>
              <z-form-control [errorMessage]="getErrorMessage(loginForm.email())">
                <input
                  z-input
                  type="email"
                  id="email"
                  placeholder="voce@exemplo.com"
                  [formField]="loginForm.email"
                />
              </z-form-control>
            </z-form-field>

            <z-form-field>
              <label z-form-label [for]="'password'">Senha</label>
              <z-form-control [errorMessage]="getErrorMessage(loginForm.password())">
                <input
                  z-input
                  type="password"
                  id="password"
                  placeholder="••••••••"
                  [formField]="loginForm.password"
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
              <z-icon zType="log-in" />
              Entrar
            </button>
          </form>
          <p class="text-center text-sm text-muted-foreground">
            Primeiro acesso?
            <a [routerLink]="['/auth/register']" class="text-primary underline-offset-4 hover:underline">
              Criar conta
            </a>
          </p>
        </div>

      </div>
    </div>
  `,
  styles: ``,
})
export default class LoginPage {
  readonly #auth = inject(AuthService);
  readonly #router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly model = signal({ email: '', password: '' });

  protected readonly loginForm = form(this.model, (s) => {
    required(s.email, { message: 'E-mail é obrigatório' });
    email(s.email, { message: 'E-mail inválido' });
    required(s.password, { message: 'Senha é obrigatória' });
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
    submit(this.loginForm, async () => {
      this.loading.set(true);
      this.errorMessage.set('');
      try {
        const { email, password } = this.model();
        await this.#auth.login(email, password);
        this.#router.navigate(['/home']);
      } catch (err) {
        this.errorMessage.set(err instanceof Error ? err.message : 'Erro ao entrar');
      } finally {
        this.loading.set(false);
      }
    });
  }
}
