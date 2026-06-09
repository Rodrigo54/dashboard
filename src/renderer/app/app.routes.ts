import { PreloadAllModules, provideRouter, Routes, withHashLocation, withPreloading, withRouterConfig, withViewTransitions } from '@angular/router';
import { authGuard } from './features/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/welcome',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes'),
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/ui/frame/frame-layout').then((m) => m.FrameLayout),
  },
  {
    path: '**',
    redirectTo: 'auth/welcome',
  },
];

export const provideAppRouting = () => {
  return provideRouter(
    routes,
    // withDebugTracing(),
    // Hash routing (URL com `#`) é obrigatório no Electron: a parte antes do `#`
    // nunca muda, então `<base href="./">` permanece estável em refresh (sem o
    // acúmulo de `auth/auth/...`) e funciona via `file://` no build de produção,
    // onde não há servidor para fazer o fallback de SPA do roteamento por path.
    withHashLocation(),
    withViewTransitions(),
    withPreloading(PreloadAllModules),
    withRouterConfig({
      onSameUrlNavigation: 'reload',
    }),
  );
};
