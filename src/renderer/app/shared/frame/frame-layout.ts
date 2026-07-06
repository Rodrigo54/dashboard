import { invoke } from '@/core/ipc/invoke';
import { HlmBreadcrumbImports } from '@/shared/spartan/breadcrumb';
import { HlmButton } from '@/shared/spartan/button';
import { HlmSeparator } from '@/shared/spartan/separator';
import { HlmSidebarImports } from '@/shared/spartan/sidebar';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLogOut } from '@ng-icons/lucide';
import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '@renderer/app/features/auth/auth.service';
import { AppData } from '@shared/types';
import { FrameSidebar } from './frame-sidebar';
import { FrameTitle } from './frame-title';

@Component({
  selector: 'app-frame-layout',
  imports: [
    HlmSidebarImports,
    HlmBreadcrumbImports,
    HlmButton,
    NgIcon,
    HlmSeparator,
    FrameSidebar,
    FrameTitle,
    RouterOutlet,
  ],
  providers: [provideIcons({ lucideLogOut })],
  template: `
    <div class="flex h-screen w-screen flex-col overflow-hidden">
      <app-frame-title />
      <div hlmSidebarWrapper class="min-h-0 flex-1 overflow-hidden">
        <app-frame-sidebar />
        <main hlmSidebarInset class="min-h-0 overflow-hidden">
          <div
            class="flex h-16 w-full shrink-0 items-center border-b border-border bg-primary px-4 text-primary-foreground"
          >
            <!-- eslint-disable-next-line @angular-eslint/template/elements-content -- conteúdo vem do próprio HlmSidebarTrigger (ícone + sr-only) -->
            <button hlmSidebarTrigger class="-ml-2"></button>
            <hlm-separator
              orientation="vertical"
              class="bg-primary-foreground mr-2 h-4 data-vertical:self-center"
            />
            <nav hlmBreadcrumb>
              <ol hlmBreadcrumbList class="text-primary-foreground/80">
                <li hlmBreadcrumbItem>
                  <a hlmBreadcrumbLink class="hover:text-primary-foreground" [link]="['/home']">
                    Home
                  </a>
                </li>
                <li hlmBreadcrumbSeparator class="flex items-center"></li>
                <li hlmBreadcrumbItem>
                  <span hlmBreadcrumbPage class="text-primary-foreground">Components</span>
                </li>
              </ol>
            </nav>
            <div class="ml-auto">
              <button type="button" hlmBtn variant="ghost" size="icon-sm" (click)="logoff()">
                <ng-icon name="lucideLogOut" class="text-[length:--spacing(3.5)]" />
              </button>
            </div>
          </div>
          <div class="min-h-0 flex-1 overflow-auto">
            <div class="h-64 bg-primary z-0"></div>
            <div class="p-4 z-10 -mt-64">
              <router-outlet />
            </div>
          </div>
          <div
            class="flex h-16 w-full shrink-0 items-center border-t border-border bg-card px-6 text-card-foreground"
          >
            <span>{{ appVersion() }}</span>
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
