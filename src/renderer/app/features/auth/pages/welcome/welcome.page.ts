import { ZardButtonComponent } from '@/shared/ui/zard/components/button/button.component';
import { ZardIconComponent } from '@/shared/ui/zard/components/icon/icon.component';
import { ChangeDetectionStrategy, Component, inject, resource } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-welcome-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ZardButtonComponent, ZardIconComponent, RouterLink],
  template: `
    <div class="flex items-center justify-center min-h-screen bg-background">
      <div class="flex flex-col items-center gap-8 w-full max-w-sm px-4">
        <div class="flex flex-col items-center gap-2 text-center">
          <div
            class="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground"
          >
            <z-icon zType="layout-dashboard" zSize="2xl" />
          </div>
          <h1 class="text-2xl font-bold text-foreground">Dashboard</h1>
          @if (firstAccess.isLoading()) {
            <p class="text-muted-foreground text-sm">Carregando...</p>
          } @else if (firstAccess.value()) {
            <p class="text-muted-foreground text-sm">Configure sua conta para começar</p>
          } @else {
            <p class="text-muted-foreground text-sm">Bem-vindo de volta!</p>
          }
        </div>

        @if (!firstAccess.isLoading()) {
          <div class="flex flex-col gap-3 w-full">
            @if (firstAccess.value()) {
              <button z-button zType="default" class="w-full" [routerLink]="['/auth/register']">
                <z-icon zType="user-plus" />
                Criar conta
              </button>
            } @else {
              <button z-button zType="default" class="w-full" [routerLink]="['/auth/login']">
                <z-icon zType="log-in" />
                Entrar
              </button>
              <button z-button zType="ghost" class="w-full" [routerLink]="['/auth/register']">
                <z-icon zType="user-plus" />
                Criar nova conta
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: ``,
})
export class WelcomePage {
  readonly #auth = inject(AuthService);
  readonly #router = inject(Router);

  protected readonly firstAccess = resource({
    loader: async () => {
      const isFirst = await this.#auth.checkFirstAccess();
      if (!isFirst) {
        const user = await this.#auth.loadCurrentUser();
        if (user) {
          this.#router.navigate(['/home']);
        }
      }
      return isFirst;
    },
  });
}
