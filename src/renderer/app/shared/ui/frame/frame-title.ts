import { ZardIconComponent } from '@/shared/ui/zard/components/icon/icon.component';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { WindowControlsService } from './window-controls.service';

@Component({
  selector: 'app-frame-title',
  imports: [ZardIconComponent],
  template: `
    <header [class]="headerClass()">
      <div class="flex items-center gap-2 px-3 text-xs font-medium">
        @if (!transparent()) {
          <span>Dashboard</span>
        }
      </div>

      <div class="no-drag ml-auto flex h-full">
        <button
          type="button"
          class="hover:bg-primary-foreground/15 flex w-11 items-center justify-center"
          aria-label="Minimizar"
          (click)="window.minimize()"
        >
          <z-icon zType="minus" zSize="sm" />
        </button>
        <button
          type="button"
          class="hover:bg-primary-foreground/15 flex w-11 items-center justify-center"
          [attr.aria-label]="window.maximized() ? 'Restaurar' : 'Maximizar'"
          (click)="window.maximizeToggle()"
        >
          <z-icon [zType]="maximizeIcon()" zSize="sm" />
        </button>
        <button
          type="button"
          class="flex w-11 items-center justify-center hover:bg-red-600 hover:text-white"
          aria-label="Fechar"
          (click)="window.close()"
        >
          <z-icon zType="x" zSize="sm" />
        </button>
      </div>
    </header>
  `,
  styles: `
    :host {
      display: block;
    }

    .drag-region {
      -webkit-app-region: drag;
      app-region: drag;
    }

    .no-drag {
      -webkit-app-region: no-drag;
      app-region: no-drag;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrameTitle {
  readonly window = inject(WindowControlsService);

  /** Remove a faixa sólida para sobrepor a barra a um fundo (ex.: auth). */
  readonly transparent = input(false);

  readonly maximizeIcon = computed(() => (this.window.maximized() ? 'copy' : 'square'));

  readonly headerClass = computed(() => {
    const base = 'drag-region text-primary-foreground flex h-8 select-none items-center';
    return this.transparent() ? base : `${base} bg-primary border-b border-border`;
  });
}
