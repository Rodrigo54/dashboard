import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FrameService {
  readonly sidebarCollapsed = signal(false);

  toggleSidebar() {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  onCollapsedChange(collapsed: boolean) {
    this.sidebarCollapsed.set(collapsed);
  }
}
