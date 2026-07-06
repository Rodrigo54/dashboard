import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@/shared/spartan/avatar';
import { HlmButton } from '@/shared/spartan/button';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight, lucideLayoutDashboard, lucideUserPlus } from '@ng-icons/lucide';
import { ChangeDetectionStrategy, Component, inject, resource } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, type PublicUser } from '../../auth.service';
import { avatarUrl, getInitials } from '../../auth.utils';

@Component({
  selector: 'app-welcome-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmAvatar, HlmAvatarImage, HlmAvatarFallback, HlmButton, NgIcon, RouterLink],
  providers: [provideIcons({ lucideChevronRight, lucideLayoutDashboard, lucideUserPlus })],
  template: `
    <div class="flex items-center justify-center min-h-screen">
      <div class="flex flex-col items-center gap-6 w-full max-w-xs px-4">
        <div class="flex flex-col items-center gap-2 text-center">
          <div
            class="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground"
          >
            <ng-icon name="lucideLayoutDashboard" class="text-[length:--spacing(8)]" />
          </div>
          <h1 class="text-2xl font-bold text-foreground">Dashboard</h1>
        </div>

        @if (users.isLoading()) {
          <div class="bg-card rounded-xl shadow p-8 w-full text-center">
            <p class="text-sm text-muted-foreground">Carregando...</p>
          </div>
        } @else if ((users.value() ?? []).length === 0) {
          <div class="bg-card rounded-xl shadow p-6 w-full flex flex-col gap-3">
            <p class="text-center text-sm text-muted-foreground">
              Configure sua conta para começar
            </p>
            <button hlmBtn variant="default" class="w-full" [routerLink]="['/auth/register']">
              <ng-icon name="lucideUserPlus" class="text-[length:--spacing(3.5)]" />
              Criar conta
            </button>
          </div>
        } @else {
          <div class="bg-card rounded-xl shadow w-full overflow-hidden">
            <p
              class="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 pt-4 pb-2"
            >
              Selecione uma conta
            </p>
            <div class="pb-1">
              @for (user of users.value(); track user.id) {
                <button
                  type="button"
                  class="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-accent hover:text-accent-foreground transition-colors"
                  (click)="selectUser(user)"
                >
                  <hlm-avatar [style.view-transition-name]="'avatar-' + user.id">
                    @if (avatar(user); as src) {
                      <img hlmAvatarImage [src]="src" [alt]="user.name" />
                    }
                    <span hlmAvatarFallback>{{ initials(user.name) }}</span>
                  </hlm-avatar>
                  <div class="flex-1 min-w-0 text-left">
                    <p class="text-sm font-medium leading-none truncate">{{ user.name }}</p>
                    <p class="text-xs text-muted-foreground mt-0.5 truncate">{{ user.email }}</p>
                  </div>
                  <ng-icon
                    name="lucideChevronRight"
                    class="text-[length:--spacing(3.5)] text-muted-foreground/50 shrink-0"
                  />
                </button>
              }
            </div>
            <div class="border-t border-border px-4 pb-4 pt-3">
              <button hlmBtn variant="ghost" class="w-full" [routerLink]="['/auth/register']">
                <ng-icon name="lucideUserPlus" class="text-[length:--spacing(3.5)]" />
                Criar nova conta
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: ``,
})
export default class WelcomePage {
  readonly #auth = inject(AuthService);
  readonly #router = inject(Router);

  protected readonly initials = getInitials;
  protected readonly avatar = avatarUrl;

  protected readonly users = resource({
    loader: async () => {
      const user = await this.#auth.loadCurrentUser();
      if (user) {
        this.#router.navigate(['/home']);
        return [];
      }
      return this.#auth.listUsers();
    },
  });

  protected selectUser(user: PublicUser): void {
    this.#router.navigate(['/auth/login'], {
      queryParams: {
        email: user.email,
        uid: user.id,
        name: user.name,
        // A URL avatar:// (protocol handler do main) — o caminho bruto do banco
        // seria bloqueado como local resource no renderer.
        ...(user.avatar ? { avatar: avatarUrl(user) } : {}),
      },
    });
  }
}
