import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@/shared/spartan/avatar';
import { HlmButton } from '@/shared/spartan/button';
import { HlmSpinner } from '@/shared/spartan/spinner';
import {
  ZardFormControlComponent,
  ZardFormFieldComponent,
  ZardFormLabelComponent,
} from '@/shared/zard/components/form/form.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLogIn } from '@ng-icons/lucide';
import { ZardInputDirective } from '@/shared/zard/components/input/input.directive';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FieldState, form, FormField, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';
import { getInitials } from '../../auth.utils';

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    HlmAvatar,
    HlmAvatarImage,
    HlmAvatarFallback,
    HlmButton,
    HlmSpinner,
    NgIcon,
    ZardFormFieldComponent,
    ZardFormControlComponent,
    ZardFormLabelComponent,
    ZardInputDirective,
    RouterLink,
  ],
  providers: [provideIcons({ lucideLogIn })],
  template: `
    <div class="flex items-center justify-center min-h-screen">
      <div class="flex flex-col gap-6 w-full max-w-xs px-4">
        <div class="bg-card rounded-xl shadow p-6 flex flex-col gap-5">
          <div class="flex flex-col items-center gap-3 text-center">
            <hlm-avatar [style.view-transition-name]="'avatar-' + profileUid" class="size-16">
              @if (profileAvatar) {
                <img hlmAvatarImage [src]="profileAvatar" [alt]="profileName" />
              }
              <span hlmAvatarFallback class="text-lg">{{ initials(profileName) }}</span>
            </hlm-avatar>
            <div>
              <p class="font-semibold text-foreground leading-none">{{ profileName }}</p>
              <p class="text-sm text-muted-foreground mt-1">{{ profileEmail }}</p>
            </div>
          </div>

          @if (errorMessage()) {
            <div
              class="rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2"
            >
              {{ errorMessage() }}
            </div>
          }

          <form (submit)="onSubmit($event)" class="flex flex-col gap-4">
            <z-form-field>
              <label z-form-label for="password">Senha</label>
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

            <button hlmBtn variant="default" type="submit" class="w-full" [disabled]="loading()">
              @if (loading()) {
                <hlm-spinner />
              } @else {
                <ng-icon name="lucideLogIn" class="text-[length:--spacing(3.5)]" />
              }
              Entrar
            </button>
          </form>

          <p class="text-center text-sm">
            <a
              [routerLink]="['/auth/welcome']"
              class="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Entrar com outra conta
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

  private readonly snapshot = inject(ActivatedRoute).snapshot;

  protected readonly profileEmail =
    (this.snapshot.queryParams['email'] as string | undefined) ?? '';
  protected readonly profileName = (this.snapshot.queryParams['name'] as string | undefined) ?? '';
  protected readonly profileAvatar =
    (this.snapshot.queryParams['avatar'] as string | undefined) ?? '';
  protected readonly profileUid = (this.snapshot.queryParams['uid'] as string | undefined) ?? '';
  protected readonly initials = getInitials;

  constructor() {
    if (!this.snapshot.queryParams['email']) {
      this.#router.navigate(['/auth/welcome']);
    }
  }

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly model = signal({ email: this.profileEmail, password: '' });

  protected readonly loginForm = form(this.model, (s) => {
    required(s.password, { message: 'Senha é obrigatória' });
  });

  protected getErrorMessage(field: FieldState<string>): string {
    if (!field.touched()) return '';
    const errors = field.errors();
    return errors.length > 0 ? (errors[0].message ?? '') : '';
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
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
