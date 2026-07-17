import { Location } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Cancelamento de formulário: volta ao estado anterior de navegação dentro
 * do app. Sem `Location.back()` puro, uma rota acessada sem navegação prévia
 * nesta janela (deep link, F5 em dev) sairia do app ou ficaria numa página
 * em branco — `fallback` cobre esse caso.
 */
@Injectable({ providedIn: 'root' })
export class GoBackService {
  readonly #location = inject(Location);
  readonly #router = inject(Router);

  goBackOr(fallback: string): void {
    if (window.history.length > 1) {
      this.#location.back();
    } else {
      void this.#router.navigate([fallback]);
    }
  }
}
