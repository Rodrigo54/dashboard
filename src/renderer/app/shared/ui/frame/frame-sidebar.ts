import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ZardButtonComponent } from '@/shared/ui/zard/components/button/button.component';
import { ZardIconComponent } from '@/shared/ui/zard/components/icon/icon.component';
import { ZardIcon } from '@/shared/ui/zard/components/icon/icons';
import { LayoutImports } from '@/shared/ui/zard/components/layout';
import { FrameProfile } from './frame-profile';
import { FrameService } from './frame.service';

interface MenuItem {
  icon: ZardIcon;
  label: string;
  link: string;
  submenu?: MenuItem[];
}

@Component({
  selector: 'app-frame-sidebar',
  imports: [LayoutImports, ZardButtonComponent, ZardIconComponent, FrameProfile, RouterLink],
  template: `
    <aside class="bg-sidebar flex h-full flex-col overflow-hidden">
      <div class="h-80 bg-primary flex-col items-start justify-center">
        <app-frame-profile />
        <nav
          [class]="
            'text-primary-foreground ' + (sidebarCollapsed() ? 'gap-1 p-1 pt-4' : 'gap-4 p-4 pt-2')
          "
        >
          <z-sidebar-group>
            @if (!sidebarCollapsed()) {
              <z-sidebar-group-label>
                <h3 class="text-primary-foreground">Main</h3>
              </z-sidebar-group-label>
            }
            @for (item of profileMenuItems; track item.label) {
              <button
                type="button"
                z-button
                zType="ghost"
                [class]="sidebarCollapsed() ? ' justify-center mx-auto' : ' justify-start'"
                zPosition="right"
                [routerLink]="item.link"
              >
                <z-icon zSize="xl" [zType]="item.icon" [class]="sidebarCollapsed() ? '' : 'mr-2'" />
                @if (!sidebarCollapsed()) {
                  <span>{{ item.label }}</span>
                }
              </button>
            }
          </z-sidebar-group>
        </nav>
      </div>
      <nav [class]="sidebarCollapsed() ? 'gap-1 p-1 pt-4' : 'gap-4 p-4'">
        <z-sidebar-group>
          @if (!sidebarCollapsed()) {
            <z-sidebar-group-label>
              <h3>Main</h3>
            </z-sidebar-group-label>
          }
          @for (item of mainMenuItems; track item.label) {
            <button
              type="button"
              z-button
              zType="ghost"
              [class]="sidebarCollapsed() ? ' justify-center mx-auto' : ' justify-start'"
              zPosition="right"
              [routerLink]="item.link"
            >
              <z-icon zSize="xl" [zType]="item.icon" [class]="sidebarCollapsed() ? '' : 'mr-2'" />
              @if (!sidebarCollapsed()) {
                <span>{{ item.label }}</span>
              }
            </button>
          }
        </z-sidebar-group>
      </nav>
    </aside>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrameSidebar {
  frame = inject(FrameService);
  sidebarCollapsed = this.frame.sidebarCollapsed;
  mainMenuItems: MenuItem[] = [
    { icon: 'inbox', label: 'Inbox', link: '/inbox' },
    { icon: 'calendar', label: 'Calendário', link: '/calendar' },
    { icon: 'landmark', label: 'Contas', link: '/accounts' },
    { icon: 'book-open', label: 'Transações', link: '/transactions' },
    { icon: 'search', label: 'Buscar', link: '/search' },
    { icon: 'folder', label: 'Projetos', link: '/projects' },
  ];

  profileMenuItems: MenuItem[] = [
    { icon: 'house', label: 'Inicio', link: '/home' },
    { icon: 'user', label: 'Perfil', link: '/profile' },
    { icon: 'bell', label: 'Notificações', link: '/notifications' },
    { icon: 'settings', label: 'Configurações', link: '/settings' },
  ];
}
