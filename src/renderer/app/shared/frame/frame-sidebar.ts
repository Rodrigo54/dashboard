import { HlmButton } from '@/shared/spartan/button';
import { LayoutImports } from '@/shared/zard/components/layout';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
import { RouterLink } from '@angular/router';
import { FrameProfile } from './frame-profile';
import { FrameService } from './frame.service';

interface MenuItem {
  icon: string;
  label: string;
  link: string;
  submenu?: MenuItem[];
}

@Component({
  selector: 'app-frame-sidebar',
  imports: [LayoutImports, HlmButton, NgIcon, FrameProfile, RouterLink],
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
                hlmBtn
                variant="ghost"
                [class]="sidebarCollapsed() ? ' justify-center mx-auto' : ' justify-start'"
                [routerLink]="item.link"
              >
                <ng-icon
                  [name]="item.icon"
                  [class]="'text-[length:--spacing(5)] ' + (sidebarCollapsed() ? '' : 'mr-2')"
                />
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
              hlmBtn
              variant="ghost"
              [class]="sidebarCollapsed() ? ' justify-center mx-auto' : ' justify-start'"
              [routerLink]="item.link"
            >
              <ng-icon
                [name]="item.icon"
                [class]="'text-[length:--spacing(5)] ' + (sidebarCollapsed() ? '' : 'mr-2')"
              />
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
