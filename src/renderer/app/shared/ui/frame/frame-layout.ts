import { AuthService } from '@/features/auth/auth.service';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ZardBreadcrumbImports } from '@/shared/ui/zard/components/breadcrumb/breadcrumb.imports';
import { ZardButtonComponent } from '@/shared/ui/zard/components/button/button.component';
import { ZardDividerComponent } from '@/shared/ui/zard/components/divider';
import { ZardIconComponent } from '@/shared/ui/zard/components/icon/icon.component';
import { LayoutImports } from '@/shared/ui/zard/components/layout';
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
          <span>© 2024 Dashboard. All rights reserved.</span>
        </z-footer>
      </z-layout>
    </z-layout>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrameLayout {
  frame = inject(FrameService);
  #authService = inject(AuthService);
  router = inject(Router);

  logoff() {
    this.#authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
