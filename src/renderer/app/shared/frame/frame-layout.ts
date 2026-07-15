import { invoke } from '@/core/ipc/invoke';
import { HlmButton } from '@/shared/spartan/button';
import { HlmSeparator } from '@/shared/spartan/separator';
import { HlmSidebarImports } from '@/shared/spartan/sidebar';
import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLogOut } from '@ng-icons/lucide';
import { AuthService } from '@renderer/app/features/auth/auth.service';
import { AppData } from '@shared/types';
import { FrameBreadcrumb } from './frame-breadcrumb';
import { FrameSidebar } from './frame-sidebar';
import { FrameTitle } from './frame-title';

@Component({
  selector: 'app-frame-layout',
  imports: [
    HlmSidebarImports,
    HlmButton,
    NgIcon,
    HlmSeparator,
    FrameSidebar,
    FrameTitle,
    FrameBreadcrumb,
    RouterOutlet,
  ],
  providers: [provideIcons({ lucideLogOut })],
  template: `
    <div class="flex h-screen w-screen flex-col overflow-hidden">
      <app-frame-title />
      <div
        hlmSidebarWrapper
        class="min-h-0 flex-1 overflow-hidden contain-layout"
        style="--frame-bg-height: 192px; --frame-breadcrumb-height: 64px"
      >
        <app-frame-sidebar />
        <main hlmSidebarInset class="min-h-0 overflow-hidden">
          <div
            class="flex h-(--frame-breadcrumb-height) w-full shrink-0 items-center border-b border-border bg-primary px-4 text-primary-foreground"
          >
            <div class="px-2">
              <button hlmSidebarTrigger class="-ml-2"></button>
            </div>
            <hlm-separator
              orientation="vertical"
              class="bg-primary-foreground mr-2 h-4 data-vertical:self-center"
            />
            <app-frame-breadcrumb />
            <div class="ml-auto">
              <button type="button" hlmBtn variant="ghost" size="icon-sm" (click)="logoff()">
                <ng-icon name="lucideLogOut" class="text-[length:--spacing(3.5)]" />
              </button>
            </div>
          </div>
          <div class="min-h-0 flex-1 overflow-auto">
            <div class="h-(--frame-bg-height) bg-primary z-0"></div>
            <div class="p-4 z-10 -mt-(--frame-bg-height)">
              <router-outlet />
            </div>
          </div>
          <div class="flex h-16 w-full shrink-0 items-center border-t border-border bg-card px-6">
            <p class="text-sm text-muted-foreground">{{ appVersion() }}</p>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrameLayout {
  readonly #auth = inject(AuthService);
  router = inject(Router);

  readonly appData = resource<AppData, unknown>({
    loader: () => invoke<AppData>('application:info'),
  });

  appVersion = computed(() => {
    const app = this.appData.value();
    const year = new Date(app?.timestamp || '').getFullYear();
    return app
      ? `© ${year} ${app.name} v${app.version} · All rights reserved · environment: ${app.environment}`
      : '';
  });

  async logoff(): Promise<void> {
    await this.#auth.logout();
    this.router.navigate(['/auth/welcome']);
  }
}
