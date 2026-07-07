import { HlmSidebarImports } from '@/shared/spartan/sidebar';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBell,
  lucideBookOpen,
  lucideCalendar,
  lucideFileText,
  lucideFolder,
  lucideHouse,
  lucideInbox,
  lucideLandmark,
  lucideSearch,
  lucideSettings,
  lucideUser,
} from '@ng-icons/lucide';
import { FrameProfile } from './frame-profile';

interface MenuItem {
  icon: string;
  label: string;
  link: string;
}

@Component({
  selector: 'app-frame-sidebar',
  imports: [HlmSidebarImports, NgIcon, FrameProfile, RouterLink],
  providers: [
    provideIcons({
      lucideBell,
      lucideBookOpen,
      lucideCalendar,
      lucideFileText,
      lucideFolder,
      lucideHouse,
      lucideInbox,
      lucideLandmark,
      lucideSearch,
      lucideSettings,
      lucideUser,
    }),
  ],
  template: `
    <hlm-sidebar collapsible="icon">
      <div class="bg-primary flex min-h-[calc(var(--frame-bg-height)+64px)] flex-col">
        <hlm-sidebar-header class="gap-4 pt-6">
          <ul hlmSidebarMenu>
            <app-frame-profile />
          </ul>
        </hlm-sidebar-header>
        <div class="flex-1"></div>
        <div hlmSidebarGroup class="text-primary-foreground">
          <div hlmSidebarGroupLabel>
            <h3 class="text-primary-foreground">Main</h3>
          </div>
          <ul hlmSidebarMenu>
            @for (item of profileMenuItems; track item.label) {
              <li hlmSidebarMenuItem>
                <button
                  type="button"
                  hlmSidebarMenuButton
                  [tooltip]="item.label"
                  [routerLink]="item.link"
                >
                  <ng-icon [name]="item.icon" />
                  <span>{{ item.label }}</span>
                </button>
              </li>
            }
          </ul>
        </div>
      </div>
      <hlm-sidebar-content>
        <div hlmSidebarGroup>
          <div hlmSidebarGroupLabel>
            <h3>Main</h3>
          </div>
          <ul hlmSidebarMenu>
            @for (item of mainMenuItems; track item.label) {
              <li hlmSidebarMenuItem>
                <button
                  type="button"
                  hlmSidebarMenuButton
                  [tooltip]="item.label"
                  [routerLink]="item.link"
                >
                  <ng-icon [name]="item.icon" />
                  <span>{{ item.label }}</span>
                </button>
              </li>
            }
          </ul>
        </div>
      </hlm-sidebar-content>
      <button type="button" hlmSidebarRail></button>
    </hlm-sidebar>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrameSidebar {
  mainMenuItems: MenuItem[] = [
    { icon: 'lucideLandmark', label: 'Contas', link: '/accounts' },
    { icon: 'lucideBookOpen', label: 'Transações', link: '/transactions' },
    { icon: 'lucideFileText', label: 'Importar Extrato', link: '/import' },

    { icon: 'lucideInbox', label: 'Inbox', link: '/inbox' },
    { icon: 'lucideCalendar', label: 'Calendário', link: '/calendar' },
    { icon: 'lucideSearch', label: 'Buscar', link: '/search' },
    { icon: 'lucideFolder', label: 'Projetos', link: '/projects' },
  ];

  profileMenuItems: MenuItem[] = [
    { icon: 'lucideHouse', label: 'Inicio', link: '/home' },
    { icon: 'lucideUser', label: 'Perfil', link: '/profile' },
    { icon: 'lucideBell', label: 'Notificações', link: '/notifications' },
    { icon: 'lucideSettings', label: 'Configurações', link: '/settings' },
  ];
}
