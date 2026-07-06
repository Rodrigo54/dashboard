import { invoke } from '@/core/ipc/invoke';
import { HlmBreadcrumbImports } from '@/shared/spartan/breadcrumb';
import { ZardButtonComponent } from '@/shared/zard/components/button/button.component';
import { HlmSeparator } from '@/shared/spartan/separator';
import { LayoutImports } from '@/shared/zard/components/layout';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLogOut, lucidePanelLeft } from '@ng-icons/lucide';
import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '@renderer/app/features/auth/auth.service';
import { AppData } from '@shared/types';
import { FrameSidebar } from './frame-sidebar';
import { FrameTitle } from './frame-title';
import { FrameService } from './frame.service';

@Component({
  selector: 'app-frame-layout',
  imports: [
    LayoutImports,
    HlmBreadcrumbImports,
    ZardButtonComponent,
    NgIcon,
    HlmSeparator,
    FrameSidebar,
    FrameTitle,
    RouterOutlet,
  ],
  providers: [provideIcons({ lucideLogOut, lucidePanelLeft })],
  template: `
    <div class="flex h-screen w-screen flex-col overflow-hidden">
      <app-frame-title />
      <z-layout class="min-h-0 flex-1 overflow-hidden">
        <!-- Sidebar -->
        <z-sidebar
          [zWidth]="250"
          [zCollapsible]="true"
          [zCollapsed]="frame.sidebarCollapsed()"
          [zCollapsedWidth]="70"
          (zCollapsedChange)="frame.onCollapsedChange($event)"
        >
          <app-frame-sidebar />
        </z-sidebar>
        <z-layout class="overflow-auto">
          <z-header class="w-full bg-primary">
            <div class="flex items-center text-primary-foreground w-full">
              <button
                type="button"
                z-button
                zType="ghost"
                zSize="sm"
                class="-ml-2"
                (click)="frame.toggleSidebar()"
              >
                <ng-icon name="lucidePanelLeft" class="text-[length:--spacing(3.5)]" />
              </button>
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
                <button type="button" z-button zType="ghost" zSize="sm" (click)="logoff()">
                  <ng-icon name="lucideLogOut" class="text-[length:--spacing(3.5)]" />
                </button>
              </div>
            </div>
          </z-header>
          <z-content class="min-h-0">
            <div class="h-full">
              <div class="h-64 bg-primary z-0"></div>
              <div class="p-4 z-10 -mt-64">
                <router-outlet />
              </div>
            </div>
          </z-content>
          <z-footer class="w-full bg-card text-card-foreground">
            <span>{{ appVersion() }}</span>
          </z-footer>
        </z-layout>
      </z-layout>
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrameLayout {
  frame = inject(FrameService);
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
