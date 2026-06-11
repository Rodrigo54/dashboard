import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FrameTitle } from '@/shared/ui/frame/frame-title';

/**
 * Layout das páginas de autenticação. Exibe a imagem
 * `public/img/login-background.webp` em tela cheia como background fixo e
 * renderiza a página filha ativa por cima via `<router-outlet>`.
 *
 * O `src` é relativo (sem barra inicial) para resolver contra o
 * `<base href="./">` do `index.html`, funcionando tanto no dev server quanto no
 * build de produção (carregado via `file://`, base `./`).
 */
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, FrameTitle],
  template: `
    <div class="relative min-h-screen w-full overflow-hidden">
      <img
        src="img/login-background.webp"
        alt=""
        aria-hidden="true"
        class="pointer-events-none fixed inset-0 -z-10 h-full w-full object-cover"
      />
      <div class="pointer-events-none fixed inset-0 -z-10 bg-background/60"></div>
      <app-frame-title class="fixed inset-x-0 top-0 z-20" [transparent]="true" />
      <router-outlet />
    </div>
  `,
  styles: ``,
})
export default class AuthLayout {}
