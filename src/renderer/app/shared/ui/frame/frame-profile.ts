import { invoke } from '@/shared/ipc/invoke';
import { ZardAvatarComponent } from '@/shared/ui/zard/components/avatar';
import { ZardIconComponent } from '@/shared/ui/zard/components/icon/icon.component';
import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { PublicUser } from '@renderer/app/features/auth/auth.service';
import { FrameService } from './frame.service';

@Component({
  selector: 'app-frame-profile',
  imports: [ZardAvatarComponent, ZardIconComponent],
  template: `
    <div
      class="text-primary-foreground flex items-center justify-center"
      [class]="sidebarCollapsed() ? 'py-10' : 'pt-6'"
    >
      <div [class]="avatarClasses()">
        <z-avatar
          zSrc="https://rodrigoalves.dev/img/profile-photo.webp"
          zAlt="Image"
          [zSize]="'default'"
          [zPriority]="true"
          class="cursor-pointer"
        />

        @if (!sidebarCollapsed()) {
          <div class="w-25">
            <span class="font-medium text-ellipsis overflow-hidden whitespace-nowrap">
              {{ userName() }}
            </span>
            <div class="text-xs text-ellipsis overflow-hidden whitespace-nowrap">
              {{ userEmail() }}
            </div>
          </div>

          <z-icon zType="chevrons-up-down" class="my-auto" />
        }
      </div>
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
  sidebarCollapsed = this.frame.sidebarCollapsed;

  avatarClasses = computed(() => {
    const baseClasses =
      'hover:bg-accent border-transparent hover:text-accent-foreground cursor-pointer  ';
    const sizeClasses = this.sidebarCollapsed()
      ? 'border-2 rounded-full mx-auto flex items-center justify-center'
      : 'rounded-md mx-4 w-full p-2 grid gap-2 grid-cols-[40px_1fr_14px]';
    return `${baseClasses} ${sizeClasses}`;
  });

  readonly userProfile = resource<PublicUser | null, unknown>({
    loader: () => invoke<PublicUser | null>('auth:me'),
  });

  userName = computed(() => this.userProfile.value()?.name);
  userEmail = computed(() => this.userProfile.value()?.email);
}
