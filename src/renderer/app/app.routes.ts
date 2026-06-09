import { PreloadAllModules, provideRouter, Routes, withHashLocation, withPreloading, withRouterConfig, withViewTransitions } from '@angular/router';
import { authGuard } from './features/auth/auth.guard';
import { FrameLayout } from './shared/ui/frame/frame-layout';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes'),
  },
  {
    path: '',
    component: FrameLayout,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', loadChildren: () => import('./features/home/home.routes') },
      { path: 'accounts', loadChildren: () => import('./features/accounts/accounts.routes') },
    ],
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
