import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/**
 * Encapsula a ponte de controles da janela frameless exposta pelo preload
 * (`window.electron.window`) e mantém o estado de maximização como signal.
 */
@Injectable({ providedIn: 'root' })
export class WindowControlsService {
  readonly #api = window.electron.window;
  readonly maximized = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);

    void this.#api.isMaximized().then((value) => this.maximized.set(value));

    const dispose = this.#api.onMaximizedChange((value) => this.maximized.set(value));
    destroyRef.onDestroy(dispose);
  }

  minimize(): void {
    this.#api.minimize();
  }

  maximizeToggle(): void {
    this.#api.maximizeToggle();
  }

  close(): void {
    this.#api.close();
  }
}
