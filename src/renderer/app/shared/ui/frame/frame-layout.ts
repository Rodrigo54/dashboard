import { invoke } from '@/shared/ipc/invoke';
import { ZardBreadcrumbImports } from '@/shared/ui/zard/components/breadcrumb';
import { ZardButtonComponent } from '@/shared/ui/zard/components/button/button.component';
import { ZardDividerComponent } from '@/shared/ui/zard/components/divider';
import { ZardIconComponent } from '@/shared/ui/zard/components/icon/icon.component';
import { LayoutImports } from '@/shared/ui/zard/components/layout';
import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AppData } from '@shared/types';
import { FrameSidebar } from './frame-sidebar';
import { FrameService } from './frame.service';

@Component({
  selector: 'app-frame-layout',
  imports: [
    LayoutImports,
    ZardBreadcrumbImports,
    ZardButtonComponent,
    ZardIconComponent,
    ZardDividerComponent,
    FrameSidebar,
    RouterOutlet,
  ],
  template: `
    <z-layout class="overflow-hidden h-screen w-screen">
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
              <z-icon zType="panel-left" />
            </button>
            <z-divider zOrientation="vertical" class="bg-primary-foreground ml-2 h-4" />
            <z-breadcrumb zWrap="wrap" zAlign="start">
              <z-breadcrumb-item zColor="primary" [routerLink]="['/home']">Home</z-breadcrumb-item>
              <z-breadcrumb-item zColor="primary">
                <span aria-current="page">Components</span>
              </z-breadcrumb-item>
            </z-breadcrumb>
            <div class="ml-auto">
              <button type="button" z-button zType="ghost" zSize="sm" (click)="logoff()">
                <z-icon zType="log-out" />
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
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrameLayout {
  frame = inject(FrameService);
  // #authService = inject(AuthService);
  router = inject(Router);

  readonly appData = resource<AppData, unknown>({
    loader: () => invoke<AppData>('appdata:read'),
  });

  appVersion = computed(() => {
    const app = this.appData.value();
    const year = new Date(app?.timestamp || '').getFullYear();
    return app
      ? `© ${year} ${app.name} v${app.version} · All rights reserved · environment: ${app.environment}`
      : '';
  });

  async logoff(): Promise<void> {
    // await this.#authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
