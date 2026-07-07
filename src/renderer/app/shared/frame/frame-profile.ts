import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@/shared/spartan/avatar';
import { HlmSidebarImports } from '@/shared/spartan/sidebar';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronsUpDown } from '@ng-icons/lucide';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@renderer/app/features/auth/auth.service';
import { avatarUrl, getInitials } from '@renderer/app/features/auth/auth.utils';

@Component({
  selector: 'app-frame-profile',
  imports: [HlmSidebarImports, HlmAvatar, HlmAvatarImage, HlmAvatarFallback, NgIcon],
  providers: [provideIcons({ lucideChevronsUpDown })],
  template: `
    <li hlmSidebarMenuItem>
      <button type="button" hlmSidebarMenuButton size="lg" (click)="openProfile()">
        <hlm-avatar class="size-8 rounded-lg">
          @if (userAvatar(); as src) {
            <img hlmAvatarImage [src]="src" [alt]="userName()" />
          }
          <span hlmAvatarFallback>{{ userInitials() }}</span>
        </hlm-avatar>
        <div class="grid flex-1 text-left leading-tight text-primary-foreground">
          <span class="truncate font-medium">{{ userName() }}</span>
          <span class="truncate text-xs">{{ userEmail() }}</span>
        </div>
        <ng-icon name="lucideChevronsUpDown" class="text-[length:--spacing(3.5)]" />
      </button>
    </li>
  `,
  styles: `
    :host {
      display: contents;
    }

    button[hlmSidebarMenuButton]:hover {
      background-color: color-mix(in oklch, var(--primary), black 12%);
      color: var(--primary-foreground);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrameProfile {
  readonly #auth = inject(AuthService);
  readonly #router = inject(Router);

  userName = computed(() => this.#auth.currentUser()?.name ?? '');
  userEmail = computed(() => this.#auth.currentUser()?.email ?? '');
  userInitials = computed(() => getInitials(this.userName()));
  userAvatar = computed(() => avatarUrl(this.#auth.currentUser()));

  openProfile(): void {
    void this.#router.navigate(['/profile']);
  }
}
