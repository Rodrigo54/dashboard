import { ZardAvatarComponent } from '@/shared/zard/components/avatar';
import { ZardButtonComponent } from '@/shared/zard/components/button/button.component';
import { ZardIconComponent } from '@/shared/zard/components/icon/icon.component';
import { ChangeDetectionStrategy, Component, inject, resource } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, type PublicUser } from '../../auth.service';
import { avatarUrl, getInitials } from '../../auth.utils';

@Component({
  selector: 'app-welcome-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ZardAvatarComponent, ZardButtonComponent, ZardIconComponent, RouterLink],
  template: `
    <div class="flex items-center justify-center min-h-screen">
      <div class="flex flex-col items-center gap-6 w-full max-w-xs px-4">
        <div class="flex flex-col items-center gap-2 text-center">
          <div
            class="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground"
          >
            <z-icon zType="layout-dashboard" zSize="2xl" />
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
            <button z-button zType="default" class="w-full" [routerLink]="['/auth/register']">
              <z-icon zType="user-plus" />
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
                  <z-avatar
                    [style.view-transition-name]="'avatar-' + user.id"
                    [zSrc]="avatar(user)"
                    [zFallback]="initials(user.name)"
                    [zAlt]="user.name"
                    zSize="sm"
                  />
                  <div class="flex-1 min-w-0 text-left">
                    <p class="text-sm font-medium leading-none truncate">{{ user.name }}</p>
                    <p class="text-xs text-muted-foreground mt-0.5 truncate">{{ user.email }}</p>
                  </div>
                  <z-icon zType="chevron-right" class="text-muted-foreground/50 shrink-0" />
                </button>
              }
            </div>
            <div class="border-t border-border px-4 pb-4 pt-3">
              <button z-button zType="ghost" class="w-full" [routerLink]="['/auth/register']">
                <z-icon zType="user-plus" />
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
