import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Sem perfil escolhido na welcome, não há o que logar — volta pro picker. */
export const loginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.selectedProfile()) return true;

  return router.createUrlTree(['/auth/welcome']);
};
