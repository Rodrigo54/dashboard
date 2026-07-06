import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@/shared/spartan/avatar';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronsUpDown } from '@ng-icons/lucide';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@renderer/app/features/auth/auth.service';
import { avatarUrl, getInitials } from '@renderer/app/features/auth/auth.utils';
import { FrameService } from './frame.service';

@Component({
  selector: 'app-frame-profile',
  imports: [HlmAvatar, HlmAvatarImage, HlmAvatarFallback, NgIcon],
  providers: [provideIcons({ lucideChevronsUpDown })],
  template: `
    <div
      class="text-primary-foreground flex items-center justify-center"
      [class]="sidebarCollapsed() ? 'py-10' : 'pt-6'"
    >
      <button type="button" [class]="avatarClasses()" (click)="openProfile()">
        <hlm-avatar size="lg" class="cursor-pointer">
          @if (userAvatar(); as src) {
            <img hlmAvatarImage [src]="src" [alt]="userName()" />
          }
          <span hlmAvatarFallback>{{ userInitials() }}</span>
        </hlm-avatar>

        @if (!sidebarCollapsed()) {
          <div class="w-25 text-left">
            <span class="font-medium text-ellipsis overflow-hidden whitespace-nowrap">
              {{ userName() }}
            </span>
            <div class="text-xs text-ellipsis overflow-hidden whitespace-nowrap">
              {{ userEmail() }}
            </div>
          </div>

          <ng-icon name="lucideChevronsUpDown" class="text-[length:--spacing(3.5)] my-auto" />
        }
      </button>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrameProfile {
  frame = inject(FrameService);
  readonly #auth = inject(AuthService);
  readonly #router = inject(Router);

  sidebarCollapsed = this.frame.sidebarCollapsed;

  avatarClasses = computed(() => {
    const baseClasses =
      'hover:bg-accent border-transparent hover:text-accent-foreground cursor-pointer  ';
    const sizeClasses = this.sidebarCollapsed()
      ? 'border-2 rounded-full mx-auto flex items-center justify-center'
      : 'rounded-md mx-4 w-full p-2 grid gap-2 grid-cols-[40px_1fr_14px]';
    return `${baseClasses} ${sizeClasses}`;
  });

  userName = computed(() => this.#auth.currentUser()?.name ?? '');
  userEmail = computed(() => this.#auth.currentUser()?.email ?? '');
  userInitials = computed(() => getInitials(this.userName()));
  userAvatar = computed(() => avatarUrl(this.#auth.currentUser()));

  openProfile(): void {
    void this.#router.navigate(['/profile']);
  }
}
